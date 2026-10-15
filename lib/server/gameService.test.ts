// @vitest-environment node
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  FAKE_ACTIONS,
  FAKE_CORRECT_ACTIONS,
  FAKE_FAILING_ACTION,
  FAKE_GAME_OVER_ACTION,
  FAKE_HINT_TEXT,
  fakeGenerator,
} from "@/lib/ai/fakeGenerator";
import { GenerationError, type TextGenerator } from "@/lib/ai/textGenerator";
import { claimBusy, loadGame } from "@/lib/db/gameRepo";
import { createPlayerPool } from "@/lib/db/testing";
import type { GameView, Leg } from "@/lib/game/types";
import { createGameService } from "./gameService";

const players = createPlayerPool();
afterAll(() => players.cleanup());

type FakeAction = { area: string; slug: string };

function serviceWith(overrides: Partial<TextGenerator> = {}) {
  const generator = { ...fakeGenerator, ...overrides };
  return createGameService(() => generator);
}

function playing(view: GameView) {
  if (view.status === "none") throw new Error("Expected a game");
  return view;
}

function idOf(view: GameView, { area, slug }: FakeAction): string {
  const action = playing(view).actions.find(
    (candidate) => candidate.address === `/${area}/${slug}`,
  );
  if (action === undefined) throw new Error(`No action /${area}/${slug}`);
  return action.id;
}

/** A player with a freshly started fake game. */
async function startedGame(service = serviceWith()) {
  const playerId = await players.create();
  expect(await service.startGame(playerId)).toEqual({
    ok: true,
    value: undefined,
  });
  return { playerId, view: await service.getGameView(playerId) };
}

describe("startGame", () => {
  it("creates leg 1 with the fake action set", async () => {
    const service = serviceWith();
    const { view } = await startedGame(service);
    const game = playing(view);
    expect(game.status).toBe("in-progress");
    expect(game.leg).toBe(1);
    expect(game.actions).toHaveLength(12);
    expect(game.attempts).toEqual([]);
  });

  it("keeps the old game when generation fails (FR-007, FR-034)", async () => {
    const { playerId, view: before } = await startedGame();
    const failing = serviceWith({
      async scenario() {
        throw new GenerationError("offline");
      },
    });

    expect(await failing.startGame(playerId)).toEqual({
      ok: false,
      code: "generation-failed",
    });
    expect(await failing.getGameView(playerId)).toEqual(before);
  });

  it("treats invalid output as a failed generation and stores nothing", async () => {
    const playerId = await players.create();
    const invalid = serviceWith({ actionSet: async () => ({ actions: [] }) });

    expect(await invalid.startGame(playerId)).toEqual({
      ok: false,
      code: "generation-failed",
    });
    expect(await loadGame(playerId)).toBeNull();
  });

  it("replaces a finished game with a fresh one", async () => {
    const service = serviceWith();
    const { playerId, view } = await startedGame(service);
    await service.takeAction(playerId, idOf(view, FAKE_GAME_OVER_ACTION));

    await service.startGame(playerId);

    const fresh = playing(await service.getGameView(playerId));
    expect(fresh.status).toBe("in-progress");
    expect(fresh.attempts).toEqual([]);
  });
});

describe("takeAction", () => {
  it("records a wrong action with a hint and marks it tried", async () => {
    const service = serviceWith();
    const { playerId, view } = await startedGame(service);
    const horn = idOf(view, FAKE_ACTIONS.horn);

    expect(await service.takeAction(playerId, horn)).toEqual({
      ok: true,
      value: {
        outcome: "continued",
        text: FAKE_HINT_TEXT,
        leg: 1,
        repeated: false,
      },
    });

    const after = playing(await service.getGameView(playerId));
    expect(after.attempts).toHaveLength(1);
    expect(
      after.actions.find((action) => action.id === horn)?.isTriedThisScenario,
    ).toBe(true);
  });

  it("resolves the scenario with the correct action", async () => {
    const service = serviceWith();
    const { playerId, view } = await startedGame(service);

    const result = await service.takeAction(
      playerId,
      idOf(view, FAKE_ACTIONS.coolantValve),
    );

    expect(result).toMatchObject({ ok: true, value: { outcome: "resolved" } });
    expect(playing(await service.getGameView(playerId)).status).toBe(
      "between-legs",
    );
  });

  it("ends the game on the game-over action", async () => {
    const service = serviceWith();
    const { playerId, view } = await startedGame(service);

    const result = await service.takeAction(
      playerId,
      idOf(view, FAKE_GAME_OVER_ACTION),
    );

    expect(result).toMatchObject({ ok: true, value: { outcome: "game-over" } });
    expect(playing(await service.getGameView(playerId)).status).toBe("lost");
    expect(
      await service.takeAction(playerId, idOf(view, FAKE_ACTIONS.horn)),
    ).toEqual({ ok: false, code: "not-allowed" });
  });

  it("writes nothing and releases the claim when generation fails (FR-027)", async () => {
    const service = serviceWith();
    const { playerId, view } = await startedGame(service);

    expect(
      await service.takeAction(playerId, idOf(view, FAKE_FAILING_ACTION)),
    ).toEqual({ ok: false, code: "generation-failed" });

    const record = await loadGame(playerId);
    expect(record?.attempts).toEqual([]);
    expect(record?.game.busySince).toBeNull();
  });

  it("returns the stored result for a repeat without generating (FR-026)", async () => {
    const result = vi.fn(fakeGenerator.result);
    const service = serviceWith({ result });
    const { playerId, view } = await startedGame(service);
    const horn = idOf(view, FAKE_ACTIONS.horn);
    await service.takeAction(playerId, horn);

    const repeat = await service.takeAction(playerId, horn);

    expect(repeat).toEqual({
      ok: true,
      value: {
        outcome: "continued",
        text: FAKE_HINT_TEXT,
        leg: 1,
        repeated: true,
      },
    });
    expect(result).toHaveBeenCalledTimes(1);
    expect((await loadGame(playerId))?.attempts).toHaveLength(1);
  });

  it("is busy while another action holds the claim", async () => {
    const service = serviceWith();
    const { playerId, view } = await startedGame(service);
    const record = await loadGame(playerId);
    if (record === null) throw new Error("no game");
    await claimBusy(record.game.id);

    expect(
      await service.takeAction(playerId, idOf(view, FAKE_ACTIONS.horn)),
    ).toEqual({ ok: false, code: "busy" });
    expect(playing(await service.getGameView(playerId)).isEvaluating).toBe(
      true,
    );
  });

  it.each([
    ["a non-string id", 42],
    ["an unknown id", crypto.randomUUID()],
  ])("rejects %s", async (_, actionId) => {
    const service = serviceWith();
    const { playerId } = await startedGame(service);
    expect(await service.takeAction(playerId, actionId)).toEqual({
      ok: false,
      code: "not-allowed",
    });
  });

  it("rejects another player's action", async () => {
    const service = serviceWith();
    const { playerId } = await startedGame(service);
    const { view: theirs } = await startedGame(service);

    expect(
      await service.takeAction(playerId, idOf(theirs, FAKE_ACTIONS.horn)),
    ).toEqual({ ok: false, code: "not-allowed" });
  });

  it("rejects actions from a player with no game", async () => {
    const service = serviceWith();
    expect(
      await service.takeAction(await players.create(), crypto.randomUUID()),
    ).toEqual({ ok: false, code: "not-allowed" });
  });
});

describe("startNextLeg", () => {
  /** Fixes `leg` with the fake fix; between legs afterwards (or won on leg 3). */
  async function fixLeg(
    service: ReturnType<typeof serviceWith>,
    playerId: string,
    leg: Leg,
  ) {
    const view = await service.getGameView(playerId);
    const result = await service.takeAction(
      playerId,
      idOf(view, FAKE_CORRECT_ACTIONS[leg]),
    );
    expect(result).toMatchObject({
      ok: true,
      value: { outcome: "resolved", leg },
    });
  }

  it("plays a whole game to a win", async () => {
    const service = serviceWith();
    const { playerId } = await startedGame(service);

    await fixLeg(service, playerId, 1);
    expect(await service.startNextLeg(playerId)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(playing(await service.getGameView(playerId))).toMatchObject({
      status: "in-progress",
      leg: 2,
    });

    await fixLeg(service, playerId, 2);
    await service.startNextLeg(playerId);
    await fixLeg(service, playerId, 3);

    const won = playing(await service.getGameView(playerId));
    expect(won.status).toBe("won");
    expect(won.attempts.map((attempt) => attempt.leg)).toEqual([1, 2, 3]);
    expect(await service.startNextLeg(playerId)).toEqual({
      ok: false,
      code: "not-allowed",
    });
  });

  it("is not allowed while a scenario is active", async () => {
    const service = serviceWith();
    const { playerId } = await startedGame(service);
    expect(await service.startNextLeg(playerId)).toEqual({
      ok: false,
      code: "not-allowed",
    });
  });

  it("stays between legs when generation fails, and can be retried", async () => {
    const service = serviceWith();
    const { playerId } = await startedGame(service);
    await fixLeg(service, playerId, 1);
    const failing = serviceWith({
      async scenario() {
        throw new GenerationError("offline");
      },
    });

    expect(await failing.startNextLeg(playerId)).toEqual({
      ok: false,
      code: "generation-failed",
    });
    const stuck = playing(await service.getGameView(playerId));
    expect(stuck.status).toBe("between-legs");
    expect(stuck.isEvaluating).toBe(false);

    expect(await service.startNextLeg(playerId)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(playing(await service.getGameView(playerId)).leg).toBe(2);
  });
});
