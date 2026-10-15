import { describe, expect, it } from "vitest";
import { applyResult, decideAttempt, type NewAttempt } from "./attempts";
import {
  actionId,
  buildAttempt,
  buildGameRecord,
  buildScenario,
  FIXTURE_CORRECT_SLUGS,
} from "./testing";
import type { Leg } from "./types";

function decideNew(...args: Parameters<typeof decideAttempt>): NewAttempt {
  const decision = decideAttempt(...args);
  if (decision.kind !== "new")
    throw new Error(`Expected a new attempt, got ${decision.kind}`);
  return decision;
}

/** A record where `leg` is active and every earlier leg is resolved. */
function recordOnLeg(leg: Leg) {
  const legs: Leg[] = [1, 2, 3];
  return buildGameRecord({
    scenarios: legs
      .filter((l) => l <= leg)
      .map((l) => buildScenario({ leg: l, isResolved: l < leg })),
  });
}

describe("decideAttempt", () => {
  it("is correct when the action ID matches the active scenario's correct action", () => {
    const decision = decideNew(buildGameRecord(), actionId("coolant-valve"));
    expect(decision.isCorrect).toBe(true);
    expect(decision.action.slug).toBe("coolant-valve");
    expect(decision.scenario.leg).toBe(1);
  });

  it("is wrong for any other action in the game", () => {
    expect(decideNew(buildGameRecord(), actionId("horn")).isCorrect).toBe(
      false,
    );
  });

  it("counts the wrong attempts already made on this scenario", () => {
    const record = buildGameRecord({
      scenarios: [
        buildScenario({ leg: 1, isResolved: true }),
        buildScenario({ leg: 2 }),
      ],
      attempts: [
        buildAttempt({
          seq: 1,
          leg: 1,
          actionSlug: "horn",
          outcome: "continued",
        }),
        buildAttempt({
          seq: 2,
          leg: 1,
          actionSlug: "coolant-valve",
          outcome: "resolved",
        }),
        buildAttempt({
          seq: 3,
          leg: 2,
          actionSlug: "horn",
          outcome: "continued",
        }),
        buildAttempt({
          seq: 4,
          leg: 2,
          actionSlug: "engine",
          outcome: "continued",
        }),
      ],
    });
    expect(decideNew(record, actionId("thermostat")).wrongAttemptsSoFar).toBe(
      2,
    );
  });

  it.each([
    [42],
    [undefined],
    [null],
    [{ id: actionId("horn") }],
    ["action-not-in-game"],
  ])("rejects %j as an action ID", (value) => {
    expect(decideAttempt(buildGameRecord(), value)).toEqual({
      kind: "not-allowed",
    });
  });

  it.each(["won", "lost"] as const)(
    "rejects actions once the game is %s",
    (status) => {
      const record = buildGameRecord({
        game: { status, endedAt: new Date() },
        scenarios: [buildScenario({ leg: 1, isResolved: status === "won" })],
      });
      expect(decideAttempt(record, actionId("horn"))).toEqual({
        kind: "not-allowed",
      });
    },
  );

  it("rejects actions between legs, when no scenario is active", () => {
    const record = buildGameRecord({
      scenarios: [buildScenario({ leg: 1, isResolved: true })],
    });
    expect(decideAttempt(record, actionId("horn"))).toEqual({
      kind: "not-allowed",
    });
  });

  it("returns the stored attempt for a repeat, so nothing is generated", () => {
    const earlier = buildAttempt({
      seq: 1,
      leg: 1,
      actionSlug: "horn",
      outcome: "continued",
    });
    const record = buildGameRecord({ attempts: [earlier] });
    expect(decideAttempt(record, actionId("horn"))).toEqual({
      kind: "repeat",
      attempt: earlier,
    });
  });

  it("allows an action tried on an earlier leg", () => {
    const record = buildGameRecord({
      scenarios: [
        buildScenario({ leg: 1, isResolved: true }),
        buildScenario({ leg: 2 }),
      ],
      attempts: [
        buildAttempt({
          seq: 1,
          leg: 1,
          actionSlug: "horn",
          outcome: "continued",
        }),
      ],
    });
    expect(decideAttempt(record, actionId("horn")).kind).toBe("new");
  });
});

describe("applyResult", () => {
  it.each([1, 2] as const)("resolves leg %i without ending the game", (leg) => {
    const decision = decideNew(
      recordOnLeg(leg),
      actionId(FIXTURE_CORRECT_SLUGS[leg]),
    );
    expect(
      applyResult(decision, { resultText: "Fixed!", isGameOver: false }),
    ).toEqual({
      outcome: "resolved",
      resultText: "Fixed!",
      leg,
      resolvesScenario: true,
      gameStatus: "in_progress",
    });
  });

  it("wins the game when leg 3 is resolved", () => {
    const decision = decideNew(
      recordOnLeg(3),
      actionId(FIXTURE_CORRECT_SLUGS[3]),
    );
    const commit = applyResult(decision, {
      resultText: "Made it!",
      isGameOver: false,
    });
    expect(commit.outcome).toBe("resolved");
    expect(commit.gameStatus).toBe("won");
  });

  it("never loses on a correct action, even if the result claims game over", () => {
    const decision = decideNew(buildGameRecord(), actionId("coolant-valve"));
    const commit = applyResult(decision, {
      resultText: "Boom?",
      isGameOver: true,
    });
    expect(commit.outcome).toBe("resolved");
    expect(commit.gameStatus).toBe("in_progress");
  });

  it("continues on a wrong action that isn't game over", () => {
    const decision = decideNew(buildGameRecord(), actionId("horn"));
    expect(
      applyResult(decision, { resultText: "Honk.", isGameOver: false }),
    ).toEqual({
      outcome: "continued",
      resultText: "Honk.",
      leg: 1,
      resolvesScenario: false,
      gameStatus: "in_progress",
    });
  });

  it("loses the game on a wrong action the result declares game over", () => {
    const decision = decideNew(
      buildGameRecord(),
      actionId("reactor-shielding"),
    );
    expect(
      applyResult(decision, { resultText: "Oops.", isGameOver: true }),
    ).toEqual({
      outcome: "game_over",
      resultText: "Oops.",
      leg: 1,
      resolvesScenario: false,
      gameStatus: "lost",
    });
  });
});
