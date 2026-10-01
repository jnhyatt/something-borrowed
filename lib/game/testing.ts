// Fixture builders for lib/game tests (and later, service tests). Pure and deterministic:
// fixed IDs and timestamps, no randomness.
import type { AreaSlug } from "./areas";
import type {
  Action,
  Attempt,
  AttemptOutcome,
  Game,
  GameRecord,
  Leg,
  RequestType,
  Scenario,
} from "./types";

export const FIXTURE_GAME_ID = "game-1";
export const FIXTURE_PLAYER_ID = "player-1";
export const FIXTURE_TIME = new Date("2026-09-30T12:00:00.000Z");

type ActionSpec = [
  area: AreaSlug,
  slug: string,
  verb: RequestType,
  label: string,
];

// Mirrors the fake generator's fixture (contracts/llm-generation.md): 12 actions, 4 per area.
const ACTION_SPECS: ActionSpec[] = [
  ["piloting", "reboot-nav-computer", "do", "Reboot the nav computer"],
  ["piloting", "autopilot", "set", "Set the autopilot to 'vibes'"],
  ["piloting", "fuzzy-dice", "remove", "Remove the fuzzy dice"],
  ["piloting", "horn", "do", "Honk the horn"],
  ["engine-room", "coolant-valve", "set", "Crank the coolant valve"],
  [
    "engine-room",
    "reactor-shielding",
    "remove",
    "Remove the reactor shielding",
  ],
  ["engine-room", "engine", "do", "Kick the engine"],
  ["engine-room", "fuel-mix", "set", "Set the fuel mix to 'extra spicy'"],
  ["life-support", "air-filter", "remove", "Pull out the air filter"],
  ["life-support", "jiggle-the-handle", "do", "Jiggle the handle"],
  ["life-support", "thermostat", "set", "Set the thermostat to 'toasty'"],
  ["life-support", "scrubber", "do", "Whack the CO2 scrubber"],
];

export const FIXTURE_ACTIONS: Action[] = ACTION_SPECS.map(
  ([area, slug, verb, label]) => ({
    id: actionId(slug),
    gameId: FIXTURE_GAME_ID,
    area,
    slug,
    verb,
    label,
    position: ACTION_SPECS.filter(([a]) => a === area).findIndex(
      ([, s]) => s === slug,
    ),
  }),
);

/** The correct action for each leg in the fixture, as in the fake generator. */
export const FIXTURE_CORRECT_SLUGS: Record<Leg, string> = {
  1: "coolant-valve",
  2: "air-filter",
  3: "reboot-nav-computer",
};

export function actionId(slug: string): string {
  return `action-${slug}`;
}

export function scenarioId(leg: Leg): string {
  return `scenario-${leg}`;
}

export function buildGame(overrides: Partial<Game> = {}): Game {
  return {
    id: FIXTURE_GAME_ID,
    playerId: FIXTURE_PLAYER_ID,
    status: "in_progress",
    busySince: null,
    createdAt: FIXTURE_TIME,
    endedAt: null,
    ...overrides,
  };
}

type ScenarioSpec = { leg: Leg; correctSlug?: string; isResolved?: boolean };

export function buildScenario({
  leg,
  correctSlug,
  isResolved = false,
}: ScenarioSpec): Scenario {
  return {
    id: scenarioId(leg),
    gameId: FIXTURE_GAME_ID,
    leg,
    symptoms: `Leg ${leg} symptoms: something rattles ominously.`,
    correctActionId: actionId(correctSlug ?? FIXTURE_CORRECT_SLUGS[leg]),
    createdAt: FIXTURE_TIME,
    resolvedAt: isResolved ? FIXTURE_TIME : null,
  };
}

type AttemptSpec = {
  seq: number;
  leg: Leg;
  actionSlug: string;
  outcome: AttemptOutcome;
};

export function buildAttempt({
  seq,
  leg,
  actionSlug,
  outcome,
}: AttemptSpec): Attempt {
  return {
    id: `attempt-${seq}`,
    gameId: FIXTURE_GAME_ID,
    scenarioId: scenarioId(leg),
    actionId: actionId(actionSlug),
    seq,
    outcome,
    resultText: `Result of ${actionSlug} on leg ${leg}.`,
    createdAt: FIXTURE_TIME,
  };
}

type GameRecordSpec = {
  game?: Partial<Game>;
  scenarios?: Scenario[];
  attempts?: Attempt[];
};

/** Defaults to a fresh game: in progress, leg 1 active, nothing tried. */
export function buildGameRecord({
  game,
  scenarios = [buildScenario({ leg: 1 })],
  attempts = [],
}: GameRecordSpec = {}): GameRecord {
  return {
    game: buildGame(game),
    actions: FIXTURE_ACTIONS,
    scenarios,
    attempts,
  };
}
