import { describe, expect, it } from "vitest";
import { BUSY_CLAIM_TIMEOUT_MS, toGameView } from "./gameView";
import {
  actionId,
  buildAttempt,
  buildGameRecord,
  buildScenario,
  FIXTURE_ACTIONS,
  FIXTURE_TIME,
} from "./testing";
import type { GameView } from "./types";

const NOW = FIXTURE_TIME;

function playing(view: GameView) {
  if (view.status === "none") throw new Error("Expected a game");
  return view;
}

describe("toGameView", () => {
  it("is `none` without a game", () => {
    expect(toGameView(null, NOW)).toEqual({ status: "none" });
  });

  it("is in progress on leg 1 for a fresh game", () => {
    const view = playing(toGameView(buildGameRecord(), NOW));
    expect(view.status).toBe("in-progress");
    expect(view.leg).toBe(1);
    expect(view.symptoms).toBe(buildScenario({ leg: 1 }).symptoms);
    expect(view.attempts).toEqual([]);
    expect(view.isEvaluating).toBe(false);
  });

  it("is between legs, showing the resolved scenario, when no scenario is active", () => {
    const record = buildGameRecord({
      scenarios: [
        buildScenario({ leg: 1, isResolved: true }),
        buildScenario({ leg: 2, isResolved: true }),
      ],
    });
    const view = playing(toGameView(record, NOW));
    expect(view.status).toBe("between-legs");
    expect(view.leg).toBe(2);
    expect(view.symptoms).toBe(buildScenario({ leg: 2 }).symptoms);
  });

  it("uses the active scenario's leg and symptoms", () => {
    const record = buildGameRecord({
      scenarios: [
        buildScenario({ leg: 1, isResolved: true }),
        buildScenario({ leg: 2 }),
      ],
    });
    const view = playing(toGameView(record, NOW));
    expect(view.status).toBe("in-progress");
    expect(view.leg).toBe(2);
    expect(view.symptoms).toBe(buildScenario({ leg: 2 }).symptoms);
  });

  it.each([
    ["won", "won"],
    ["lost", "lost"],
  ] as const)("reports a %s game as %s", (status, expected) => {
    const record = buildGameRecord({
      game: { status, endedAt: NOW },
      scenarios: [buildScenario({ leg: 1, isResolved: status === "won" })],
    });
    expect(toGameView(record, NOW).status).toBe(expected);
  });

  it("orders actions by area, then position, with addresses", () => {
    const shuffled = buildGameRecord();
    const view = playing(
      toGameView({ ...shuffled, actions: [...FIXTURE_ACTIONS].reverse() }, NOW),
    );
    expect(view.actions.map((action) => action.address)).toEqual(
      FIXTURE_ACTIONS.map((action) => `/${action.area}/${action.slug}`),
    );
    expect(view.actions[0]).toEqual({
      id: actionId("reboot-nav-computer"),
      label: "Reboot the nav computer",
      requestType: "do",
      area: "piloting",
      address: "/piloting/reboot-nav-computer",
      isTriedThisScenario: false,
    });
  });

  it("marks actions tried on the active scenario only, so markers reset each leg", () => {
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
          actionSlug: "engine",
          outcome: "continued",
        }),
      ],
    });
    const tried = playing(toGameView(record, NOW))
      .actions.filter((action) => action.isTriedThisScenario)
      .map((action) => action.id);
    expect(tried).toEqual([actionId("engine")]);
  });

  it("marks nothing as tried between legs", () => {
    const record = buildGameRecord({
      scenarios: [buildScenario({ leg: 1, isResolved: true })],
      attempts: [
        buildAttempt({
          seq: 1,
          leg: 1,
          actionSlug: "coolant-valve",
          outcome: "resolved",
        }),
      ],
    });
    const view = playing(toGameView(record, NOW));
    expect(view.actions.some((action) => action.isTriedThisScenario)).toBe(
      false,
    );
  });

  it("lists attempts oldest first with their leg, action and view outcome", () => {
    const record = buildGameRecord({
      game: { status: "lost", endedAt: NOW },
      scenarios: [
        buildScenario({ leg: 1, isResolved: true }),
        buildScenario({ leg: 2 }),
      ],
      attempts: [
        buildAttempt({
          seq: 3,
          leg: 2,
          actionSlug: "reactor-shielding",
          outcome: "game_over",
        }),
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
    expect(playing(toGameView(record, NOW)).attempts).toEqual([
      {
        order: 1,
        leg: 1,
        actionLabel: "Honk the horn",
        area: "piloting",
        outcome: "continued",
        text: "Result of horn on leg 1.",
      },
      {
        order: 2,
        leg: 1,
        actionLabel: "Crank the coolant valve",
        area: "engine-room",
        outcome: "resolved",
        text: "Result of coolant-valve on leg 1.",
      },
      {
        order: 3,
        leg: 2,
        actionLabel: "Remove the reactor shielding",
        area: "engine-room",
        outcome: "game-over",
        text: "Result of reactor-shielding on leg 2.",
      },
    ]);
  });

  it.each([
    ["no claim", null, false],
    ["a fresh claim", new Date(NOW.getTime() - 1_000), true],
    [
      "a claim exactly at the timeout",
      new Date(NOW.getTime() - BUSY_CLAIM_TIMEOUT_MS),
      true,
    ],
    [
      "a stale claim",
      new Date(NOW.getTime() - BUSY_CLAIM_TIMEOUT_MS - 1),
      false,
    ],
  ])("isEvaluating with %s is %s", (_label, busySince, expected) => {
    const view = playing(
      toGameView(buildGameRecord({ game: { busySince } }), NOW),
    );
    expect(view.isEvaluating).toBe(expected);
  });

  it("never exposes the correct action", () => {
    const record = buildGameRecord();
    const serialized = JSON.stringify(toGameView(record, NOW));
    expect(serialized).not.toContain("correct");
    // The correct action's ID appears only as that action's own `id`, like every action.
    const view = playing(toGameView(record, NOW));
    const correctId = record.scenarios[0]?.correctActionId;
    expect(
      view.actions.filter((action) => action.id === correctId),
    ).toHaveLength(1);
    expect(serialized.split(String(correctId)).length - 1).toBe(1);
  });
});
