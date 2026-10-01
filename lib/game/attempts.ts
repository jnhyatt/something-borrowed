import type {
  Action,
  Attempt,
  AttemptOutcome,
  GameRecord,
  GameStatus,
  Leg,
  Scenario,
} from "./types";

export type NewAttempt = {
  kind: "new";
  action: Action;
  scenario: Scenario;
  isCorrect: boolean;
  // Attempts already made on this scenario; while it's active, all of them were wrong.
  wrongAttemptsSoFar: number;
};

export type AttemptDecision =
  { kind: "not-allowed" } | { kind: "repeat"; attempt: Attempt } | NewAttempt;

/** The generated result for an attempt, after validation. */
export type GeneratedResult = { resultText: string; isGameOver: boolean };

/** What the service writes for an attempt, in one transaction. */
export type AttemptCommit = {
  outcome: AttemptOutcome;
  resultText: string;
  leg: Leg;
  resolvesScenario: boolean;
  gameStatus: GameStatus;
};

const FINAL_LEG: Leg = 3;

export function findActiveScenario(record: GameRecord): Scenario | undefined {
  return record.scenarios.find((scenario) => scenario.resolvedAt === null);
}

export function decideAttempt(
  record: GameRecord,
  actionId: unknown,
): AttemptDecision {
  const action = record.actions.find((candidate) => candidate.id === actionId);
  if (action === undefined) return { kind: "not-allowed" };

  const scenario = findActiveScenario(record);
  if (record.game.status !== "in_progress" || scenario === undefined) {
    return { kind: "not-allowed" };
  }

  const attemptsThisScenario = record.attempts.filter(
    (attempt) => attempt.scenarioId === scenario.id,
  );
  const repeat = attemptsThisScenario.find(
    (attempt) => attempt.actionId === action.id,
  );
  if (repeat !== undefined) return { kind: "repeat", attempt: repeat };

  return {
    kind: "new",
    action,
    scenario,
    isCorrect: action.id === scenario.correctActionId,
    wrongAttemptsSoFar: attemptsThisScenario.length,
  };
}

export function applyResult(
  decision: NewAttempt,
  result: GeneratedResult,
): AttemptCommit {
  const { leg } = decision.scenario;
  const base = { resultText: result.resultText, leg };

  if (decision.isCorrect) {
    return {
      ...base,
      outcome: "resolved",
      resolvesScenario: true,
      gameStatus: leg === FINAL_LEG ? "won" : "in_progress",
    };
  }
  if (result.isGameOver) {
    return {
      ...base,
      outcome: "game_over",
      resolvesScenario: false,
      gameStatus: "lost",
    };
  }
  return {
    ...base,
    outcome: "continued",
    resolvesScenario: false,
    gameStatus: "in_progress",
  };
}
