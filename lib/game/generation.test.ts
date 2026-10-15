import { describe, expect, it } from "vitest";
import {
  buildResultRequest,
  buildScenarioRequest,
  findActionByKey,
  keyActions,
} from "./generation";
import {
  actionId,
  buildAttempt,
  buildGameRecord,
  buildScenario,
  FIXTURE_ACTIONS,
} from "./testing";

describe("keyActions", () => {
  it("keys actions A1…An by area order, then position, whatever the input order", () => {
    const keyed = keyActions([...FIXTURE_ACTIONS].reverse());
    expect(keyed.map((action) => action.key)).toEqual(
      FIXTURE_ACTIONS.map((_, index) => `A${index + 1}`),
    );
    expect(keyed[0]?.slug).toBe("reboot-nav-computer");
    expect(keyed[4]?.slug).toBe("coolant-valve");
  });

  it("finds an action by its key", () => {
    expect(findActionByKey(FIXTURE_ACTIONS, "A5")?.slug).toBe("coolant-valve");
    expect(findActionByKey(FIXTURE_ACTIONS, "A99")).toBeUndefined();
  });
});

describe("buildScenarioRequest", () => {
  it("includes every earlier leg with its correct key and attempts, and no IDs", () => {
    const record = buildGameRecord({
      scenarios: [buildScenario({ leg: 1, isResolved: true })],
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
      ],
    });

    const request = buildScenarioRequest(record, 2);

    expect(request.leg).toBe(2);
    expect(request.history).toEqual([
      {
        leg: 1,
        symptoms: record.scenarios[0]?.symptoms,
        correctActionKey: "A5",
        attempts: [
          {
            actionKey: "A4",
            outcome: "continued",
            resultText: "Result of horn on leg 1.",
          },
          {
            actionKey: "A5",
            outcome: "resolved",
            resultText: "Result of coolant-valve on leg 1.",
          },
        ],
      },
    ]);
    expect(JSON.stringify(request)).not.toContain(actionId(""));
  });
});

describe("buildResultRequest", () => {
  it("names the action taken by key and carries the wrong-attempt count", () => {
    const record = buildGameRecord();
    const action = FIXTURE_ACTIONS.find((a) => a.slug === "horn");
    if (action === undefined) throw new Error("fixture lacks horn");

    const request = buildResultRequest(record, {
      action,
      isCorrect: false,
      wrongAttemptsSoFar: 2,
    });

    expect(request.actionKey).toBe("A4");
    expect(request.isCorrect).toBe(false);
    expect(request.wrongAttemptsThisScenario).toBe(2);
    expect(request.history.map((leg) => leg.leg)).toEqual([1]);
  });
});
