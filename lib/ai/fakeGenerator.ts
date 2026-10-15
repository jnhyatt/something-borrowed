import "server-only";
import type { AreaSlug } from "@/lib/game/areas";
import type { KeyedAction } from "@/lib/game/generation";
import type { Leg, RequestType } from "@/lib/game/types";
import { GenerationError, type TextGenerator } from "./textGenerator";

// Deterministic stand-in for OpenRouter (AI_PROVIDER=fake), for e2e tests and offline play.
// See contracts/llm-generation.md#fake-generator.

type FakeAction = {
  area: AreaSlug;
  slug: string;
  verb: RequestType;
  label: string;
};

/** The fixed action set: 12 actions, 4 per area. Tests refer to actions through these. */
export const FAKE_ACTIONS = {
  rebootNavComputer: {
    area: "piloting",
    slug: "reboot-nav-computer",
    verb: "do",
    label: "Reboot the nav computer",
  },
  autopilot: {
    area: "piloting",
    slug: "autopilot",
    verb: "set",
    label: "Set the autopilot to 'vibes'",
  },
  fuzzyDice: {
    area: "piloting",
    slug: "fuzzy-dice",
    verb: "remove",
    label: "Remove the fuzzy dice",
  },
  horn: { area: "piloting", slug: "horn", verb: "do", label: "Honk the horn" },
  coolantValve: {
    area: "engine-room",
    slug: "coolant-valve",
    verb: "set",
    label: "Crank the coolant valve",
  },
  reactorShielding: {
    area: "engine-room",
    slug: "reactor-shielding",
    verb: "remove",
    label: "Remove the reactor shielding",
  },
  engine: {
    area: "engine-room",
    slug: "engine",
    verb: "do",
    label: "Kick the engine",
  },
  fuelMix: {
    area: "engine-room",
    slug: "fuel-mix",
    verb: "set",
    label: "Set the fuel mix to 'extra spicy'",
  },
  airFilter: {
    area: "life-support",
    slug: "air-filter",
    verb: "remove",
    label: "Pull out the air filter",
  },
  jiggleTheHandle: {
    area: "life-support",
    slug: "jiggle-the-handle",
    verb: "do",
    label: "Jiggle the handle",
  },
  thermostat: {
    area: "life-support",
    slug: "thermostat",
    verb: "set",
    label: "Set the thermostat to 'toasty'",
  },
  scrubber: {
    area: "life-support",
    slug: "scrubber",
    verb: "do",
    label: "Whack the CO2 scrubber",
  },
} as const satisfies Record<string, FakeAction>;

/** The fix for each leg: PUT coolant valve, DELETE air filter, POST reboot nav computer. */
export const FAKE_CORRECT_ACTIONS: Record<Leg, FakeAction> = {
  1: FAKE_ACTIONS.coolantValve,
  2: FAKE_ACTIONS.airFilter,
  3: FAKE_ACTIONS.rebootNavComputer,
};

/** The only wrong action that ends the game. */
export const FAKE_GAME_OVER_ACTION: FakeAction = FAKE_ACTIONS.reactorShielding;

/** Generating a result for this action always fails, to exercise error-and-retry. */
export const FAKE_FAILING_ACTION: FakeAction = FAKE_ACTIONS.jiggleTheHandle;

export const FAKE_SYMPTOMS: Record<Leg, string> = {
  1: "Every gauge on the dash is pinned in the red, the cabin smells like a kettle left on all night, and something below deck is whistling a jaunty tune.",
  2: "Everyone aboard is wheezing, the air tastes faintly of old socks, and a little cartoon cloud of dust follows you from room to room.",
  3: "The stars outside are drifting in a slow, confused circle, and a cheerful voice keeps announcing that you have arrived at a destination you have never heard of.",
};

export const FAKE_SUCCESS_TEXT =
  "A satisfying clunk, a hiss, and the warning lights blink off one by one. The junker shudders back to something like health.";

export const FAKE_HINT_TEXT =
  "Nothing improves, though the ship makes a sound like a disappointed sigh. Maybe the problem is somewhere else.";

export const FAKE_GAME_OVER_TEXT =
  "Bright green light floods the cabin and every alarm on board goes off at once. You're being towed to the scrapyard.";

function isSame(action: FakeAction, other: FakeAction): boolean {
  return (
    action.area === other.area &&
    action.slug === other.slug &&
    action.verb === other.verb
  );
}

function keyOf(actions: KeyedAction[], target: FakeAction): string {
  const match = actions.find((action) => isSame(action, target));
  if (match === undefined) {
    throw new GenerationError(`Fake action set lacks ${target.slug}`);
  }
  return match.key;
}

export const fakeGenerator: TextGenerator = {
  async actionSet() {
    return { actions: Object.values(FAKE_ACTIONS) };
  },

  async scenario({ leg, actions }) {
    return {
      symptoms: FAKE_SYMPTOMS[leg],
      correctActionKey: keyOf(actions, FAKE_CORRECT_ACTIONS[leg]),
    };
  },

  async result({ actions, actionKey, isCorrect }) {
    const action = actions.find((candidate) => candidate.key === actionKey);
    if (action === undefined) {
      throw new GenerationError(`Unknown action key ${actionKey}`);
    }
    if (isSame(action, FAKE_FAILING_ACTION)) {
      throw new GenerationError("The fake generator always fails here");
    }
    if (isCorrect) return { resultText: FAKE_SUCCESS_TEXT, isGameOver: false };
    if (isSame(action, FAKE_GAME_OVER_ACTION)) {
      return { resultText: FAKE_GAME_OVER_TEXT, isGameOver: true };
    }
    return { resultText: FAKE_HINT_TEXT, isGameOver: false };
  },
};
