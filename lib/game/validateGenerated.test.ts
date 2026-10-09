import { describe, expect, it } from "vitest";
import { buildScenarioRequest } from "./generation";
import { buildGameRecord, buildScenario, FIXTURE_ACTIONS } from "./testing";
import {
  parseActionSet,
  parseResult,
  parseScenario,
} from "./validateGenerated";

const VALID_ACTIONS = FIXTURE_ACTIONS.map(({ area, slug, verb, label }) => ({
  area,
  slug,
  verb,
  label,
}));

describe("parseActionSet", () => {
  it("accepts a valid set and numbers positions within each area", () => {
    const result = parseActionSet({ actions: VALID_ACTIONS });
    if (!result.ok) throw new Error(result.reason);
    expect(result.value).toHaveLength(12);
    expect(
      result.value
        .filter((action) => action.area === "engine-room")
        .map((action) => action.position),
    ).toEqual([0, 1, 2, 3]);
  });

  it.each([
    ["not an object", "nope"],
    ["fewer than 10 actions", { actions: VALID_ACTIONS.slice(0, 9) }],
    [
      "an area with fewer than 3 actions",
      {
        actions: [
          ...VALID_ACTIONS.filter((action) => action.area !== "piloting"),
          ...VALID_ACTIONS.slice(0, 2),
        ],
      },
    ],
    [
      "a duplicate (verb, area, slug)",
      { actions: [...VALID_ACTIONS, VALID_ACTIONS[0]] },
    ],
    [
      "a reserved slug",
      { actions: [...VALID_ACTIONS, { ...VALID_ACTIONS[0], slug: "log" }] },
    ],
    [
      "a slug that isn't kebab-case",
      { actions: [...VALID_ACTIONS, { ...VALID_ACTIONS[0], slug: "Big_Red" }] },
    ],
    [
      "an unknown area",
      { actions: [...VALID_ACTIONS, { ...VALID_ACTIONS[0], area: "galley" }] },
    ],
    [
      "an empty label",
      {
        actions: [
          ...VALID_ACTIONS,
          { ...VALID_ACTIONS[0], slug: "x", label: " " },
        ],
      },
    ],
  ])("rejects %s", (_, raw) => {
    expect(parseActionSet(raw).ok).toBe(false);
  });
});

describe("parseScenario", () => {
  const symptoms = "The ship is making a noise like a goose in a tumble dryer.";
  const leg2Request = buildScenarioRequest(
    buildGameRecord({
      scenarios: [buildScenario({ leg: 1, isResolved: true })],
    }),
    2,
  );

  it("accepts symptoms with a known, unused correct action key", () => {
    expect(
      parseScenario({ symptoms, correctActionKey: "A9" }, leg2Request),
    ).toEqual({ ok: true, value: { symptoms, correctActionKey: "A9" } });
  });

  it("rejects an unknown key", () => {
    expect(
      parseScenario({ symptoms, correctActionKey: "A13" }, leg2Request).ok,
    ).toBe(false);
  });

  it("rejects the key that fixed an earlier leg (FR-018)", () => {
    // A5 is the coolant valve, leg 1's fix.
    expect(
      parseScenario({ symptoms, correctActionKey: "A5" }, leg2Request).ok,
    ).toBe(false);
  });

  it("rejects symptoms that are too short", () => {
    expect(
      parseScenario({ symptoms: "Bad.", correctActionKey: "A9" }, leg2Request)
        .ok,
    ).toBe(false);
  });
});

describe("parseResult", () => {
  it("accepts text and a game-over flag", () => {
    const raw = {
      resultText: "The engine coughs politely.",
      isGameOver: false,
    };
    expect(parseResult(raw)).toEqual({ ok: true, value: raw });
  });

  it("rejects a result missing isGameOver", () => {
    expect(parseResult({ resultText: "The engine coughs politely." }).ok).toBe(
      false,
    );
  });
});
