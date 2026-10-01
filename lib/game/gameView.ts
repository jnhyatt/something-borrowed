import { AREAS } from "./areas";
import { findActiveScenario } from "./attempts";
import type {
  ActionView,
  AttemptOutcome,
  AttemptView,
  GameRecord,
  GameStatus,
  GameView,
  Scenario,
} from "./types";

export const BUSY_CLAIM_TIMEOUT_MS = 60_000;

const VIEW_OUTCOME: Record<AttemptOutcome, AttemptView["outcome"]> = {
  resolved: "resolved",
  continued: "continued",
  game_over: "game-over",
};

const ENDED_STATUS: Record<
  Exclude<GameStatus, "in_progress">,
  "won" | "lost"
> = {
  won: "won",
  lost: "lost",
};

const AREA_ORDER = new Map<string, number>(
  AREAS.map((area, index) => [area.slug, index]),
);

function latestScenario(scenarios: Scenario[]): Scenario {
  const latest = scenarios.reduce<Scenario | undefined>(
    (best, scenario) =>
      best === undefined || scenario.leg > best.leg ? scenario : best,
    undefined,
  );
  // Games are only stored together with scenario 1, so this is a broken invariant.
  if (latest === undefined) throw new Error("Game has no scenarios");
  return latest;
}

/**
 * Derives everything the screens render from one stored game (data-model.md, "Derived
 * state"). `now` is injected so the busy-claim check is deterministic.
 */
export function toGameView(record: GameRecord | null, now: Date): GameView {
  if (record === null) return { status: "none" };

  const { game, actions, scenarios, attempts } = record;
  const active = findActiveScenario(record);
  const shown = active ?? latestScenario(scenarios);

  const status =
    game.status === "in_progress"
      ? active
        ? "in-progress"
        : "between-legs"
      : ENDED_STATUS[game.status];

  const triedIds = new Set(
    active
      ? attempts
          .filter((attempt) => attempt.scenarioId === active.id)
          .map((a) => a.actionId)
      : [],
  );

  const actionViews: ActionView[] = [...actions]
    .sort(
      (a, b) =>
        (AREA_ORDER.get(a.area) ?? 0) - (AREA_ORDER.get(b.area) ?? 0) ||
        a.position - b.position,
    )
    .map((action) => ({
      id: action.id,
      label: action.label,
      requestType: action.verb,
      area: action.area,
      address: `/${action.area}/${action.slug}`,
      isTriedThisScenario: triedIds.has(action.id),
    }));

  const actionsById = new Map(actions.map((action) => [action.id, action]));
  const scenariosById = new Map(
    scenarios.map((scenario) => [scenario.id, scenario]),
  );

  const attemptViews: AttemptView[] = [...attempts]
    .sort((a, b) => a.seq - b.seq)
    .flatMap((attempt) => {
      const action = actionsById.get(attempt.actionId);
      const scenario = scenariosById.get(attempt.scenarioId);
      // Foreign keys guarantee both exist; skip rather than crash if a caller passes less.
      if (action === undefined || scenario === undefined) return [];
      return [
        {
          order: attempt.seq,
          leg: scenario.leg,
          actionLabel: action.label,
          area: action.area,
          outcome: VIEW_OUTCOME[attempt.outcome],
          text: attempt.resultText,
        },
      ];
    });

  const isEvaluating =
    game.busySince !== null &&
    now.getTime() - game.busySince.getTime() <= BUSY_CLAIM_TIMEOUT_MS;

  return {
    status,
    leg: shown.leg,
    symptoms: shown.symptoms,
    actions: actionViews,
    attempts: attemptViews,
    isEvaluating,
  };
}
