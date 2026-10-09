// The structured input for each generation kind (contracts/llm-generation.md). Built only from
// stored game data, never player text (FR-036). Actions are referred to by short prompt keys
// (A1…An), never by database IDs.
import { AREAS, type AreaSlug } from "./areas";
import type { Action, AttemptOutcome, GameRecord, Leg } from "./types";

export const ACTION_SET_LIMITS = {
  minPerArea: 3,
  minTotal: 10,
  maxTotal: 30,
} as const;

/** An action's content, before or after it's stored. */
export type ActionSpec = Pick<
  Action,
  "area" | "slug" | "verb" | "label" | "position"
>;

export type KeyedAction<T extends ActionSpec = ActionSpec> = T & {
  key: string;
};

export type LegHistory = {
  leg: Leg;
  symptoms: string;
  correctActionKey: string;
  attempts: {
    actionKey: string;
    outcome: AttemptOutcome;
    resultText: string;
  }[];
};

export type ActionSetRequest = {
  areas: { slug: AreaSlug; name: string }[];
  limits: typeof ACTION_SET_LIMITS;
};

export type ScenarioRequest = {
  leg: Leg;
  actions: KeyedAction[];
  history: LegHistory[];
};

export type ResultRequest = {
  actions: KeyedAction[];
  // Every leg so far, including the current one.
  history: LegHistory[];
  actionKey: string;
  isCorrect: boolean;
  wrongAttemptsThisScenario: number;
};

const AREA_ORDER = new Map<string, number>(
  AREAS.map((area, index) => [area.slug, index]),
);

/** Display order: by area (AREAS order), then position within the area. */
export function compareActions(a: ActionSpec, b: ActionSpec): number {
  return (
    (AREA_ORDER.get(a.area) ?? 0) - (AREA_ORDER.get(b.area) ?? 0) ||
    a.position - b.position
  );
}

/** Assigns prompt keys in display order, so the same set always gets the same keys. */
export function keyActions<T extends ActionSpec>(
  actions: readonly T[],
): KeyedAction<T>[] {
  return [...actions]
    .sort(compareActions)
    .map((action, index) => ({ ...action, key: `A${index + 1}` }));
}

export function buildActionSetRequest(): ActionSetRequest {
  return {
    areas: AREAS.map(({ slug, name }) => ({ slug, name })),
    limits: ACTION_SET_LIMITS,
  };
}

type HistorySource = Pick<GameRecord, "actions" | "scenarios" | "attempts">;

function buildHistory(
  { scenarios, attempts }: HistorySource,
  keyById: Map<string, string>,
): LegHistory[] {
  const keyOf = (actionId: string) => keyById.get(actionId) ?? "?";
  return [...scenarios]
    .sort((a, b) => a.leg - b.leg)
    .map((scenario) => ({
      leg: scenario.leg,
      symptoms: scenario.symptoms,
      correctActionKey: keyOf(scenario.correctActionId),
      attempts: attempts
        .filter((attempt) => attempt.scenarioId === scenario.id)
        .sort((a, b) => a.seq - b.seq)
        .map((attempt) => ({
          actionKey: keyOf(attempt.actionId),
          outcome: attempt.outcome,
          resultText: attempt.resultText,
        })),
    }));
}

function keyed(source: HistorySource) {
  const actions = keyActions(source.actions);
  const keyById = new Map(actions.map((action) => [action.id, action.key]));
  return { actions, keyById };
}

/** Strips the IDs, which never go to the generator. */
function toPromptActions(actions: KeyedAction<Action>[]): KeyedAction[] {
  return actions.map(({ key, area, slug, verb, label, position }) => ({
    key,
    area,
    slug,
    verb,
    label,
    position,
  }));
}

export function buildScenarioRequest(
  source: HistorySource,
  leg: Leg,
): ScenarioRequest {
  const { actions, keyById } = keyed(source);
  return {
    leg,
    actions: toPromptActions(actions),
    history: buildHistory(source, keyById),
  };
}

export function buildResultRequest(
  source: HistorySource,
  attempt: { action: Action; isCorrect: boolean; wrongAttemptsSoFar: number },
): ResultRequest {
  const { actions, keyById } = keyed(source);
  return {
    actions: toPromptActions(actions),
    history: buildHistory(source, keyById),
    actionKey: keyById.get(attempt.action.id) ?? "?",
    isCorrect: attempt.isCorrect,
    wrongAttemptsThisScenario: attempt.wrongAttemptsSoFar,
  };
}

/** Maps a generated `correctActionKey` back to the action it names. */
export function findActionByKey<T extends ActionSpec>(
  actions: readonly T[],
  key: string,
): T | undefined {
  return keyActions(actions).find((action) => action.key === key);
}
