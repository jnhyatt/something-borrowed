// @vitest-environment node
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "./client";
import {
  claimBusy,
  commitAttempt,
  loadGame,
  releaseBusy,
  replaceGame,
} from "./gameRepo";
import { attempts, games, scenarios } from "./schema";
import { buildNewGame, createPlayerPool } from "./testing";

const players = createPlayerPool();
afterAll(() => players.cleanup());

/** A player with a fresh game on leg 1. */
async function playerWithGame() {
  const playerId = await players.create();
  const game = buildNewGame();
  await replaceGame(playerId, game);
  return { playerId, game };
}

function action(game: ReturnType<typeof buildNewGame>, slug: string) {
  const found = game.actionBySlug.get(slug);
  if (found === undefined) throw new Error(`No fixture action ${slug}`);
  return found;
}

/** Postgres reports the violated constraint on the driver error, wrapped by Drizzle. */
async function expectViolation(write: Promise<unknown>, constraint: string) {
  await expect(write).rejects.toMatchObject({
    cause: { constraint_name: constraint },
  });
}

const WRONG_ATTEMPT = {
  outcome: "continued",
  resultText: "The horn plays a sad trombone.",
  resolvesScenario: false,
  gameStatus: "in_progress",
  leg: 1,
} as const;

describe("loadGame / replaceGame", () => {
  it("is null for a player without a game", async () => {
    expect(await loadGame(await players.create())).toBeNull();
  });

  it("stores the whole game and reads it back", async () => {
    const { playerId, game } = await playerWithGame();
    const record = await loadGame(playerId);
    expect(record?.game).toMatchObject({
      id: game.id,
      playerId,
      status: "in_progress",
      busySince: null,
      endedAt: null,
    });
    expect(record?.actions).toHaveLength(12);
    expect(record?.scenarios).toEqual([
      expect.objectContaining({
        ...game.firstScenario,
        leg: 1,
        resolvedAt: null,
      }),
    ]);
    expect(record?.attempts).toEqual([]);
  });

  it("replaces the old game, deleting its rows", async () => {
    const { playerId, game: old } = await playerWithGame();
    const replacement = buildNewGame();

    expect(await replaceGame(playerId, replacement)).toBe("replaced");

    expect((await loadGame(playerId))?.game.id).toBe(replacement.id);
    const leftovers = await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.gameId, old.id));
    expect(leftovers).toEqual([]);
  });

  it("refuses to replace a game while it holds a live claim", async () => {
    const { playerId, game } = await playerWithGame();
    await claimBusy(game.id);

    expect(await replaceGame(playerId, buildNewGame())).toBe("busy");
    expect((await loadGame(playerId))?.game.id).toBe(game.id);
  });
});

describe("constraints", () => {
  it("allows one game per player (FR-003)", async () => {
    const { playerId } = await playerWithGame();
    await expectViolation(
      db.insert(games).values({ playerId }),
      "games_player_id_unique",
    );
  });

  it("allows one active scenario per game", async () => {
    const { game } = await playerWithGame();
    await expectViolation(
      db.insert(scenarios).values({
        gameId: game.id,
        leg: 2,
        symptoms: "A second, simultaneous emergency.",
        correctActionId: action(game, "air-filter").id,
      }),
      "scenarios_one_active",
    );
  });

  it("allows one attempt per action per scenario (FR-026)", async () => {
    const { game } = await playerWithGame();
    const row = {
      gameId: game.id,
      scenarioId: game.firstScenario.id,
      actionId: action(game, "horn").id,
      outcome: "continued" as const,
      resultText: "Honk.",
    };
    await db.insert(attempts).values({ ...row, seq: 1 });
    await expectViolation(
      db.insert(attempts).values({ ...row, seq: 2 }),
      "attempts_scenario_id_action_id_unique",
    );
  });

  it("rejects a scenario whose correct action belongs to another game", async () => {
    const { game } = await playerWithGame();
    const { game: other } = await playerWithGame();
    await db
      .update(scenarios)
      .set({ resolvedAt: sql`now()` })
      .where(eq(scenarios.gameId, game.id));

    await expectViolation(
      db.insert(scenarios).values({
        gameId: game.id,
        leg: 2,
        symptoms: "Borrowed trouble from another game.",
        correctActionId: action(other, "air-filter").id,
      }),
      "scenarios_game_id_correct_action_id_actions_game_id_id_fk",
    );
  });

  it("rejects an attempt on another game's action", async () => {
    const { game } = await playerWithGame();
    const { game: other } = await playerWithGame();
    await expectViolation(
      db.insert(attempts).values({
        gameId: game.id,
        scenarioId: game.firstScenario.id,
        actionId: action(other, "horn").id,
        seq: 1,
        outcome: "continued",
        resultText: "Wrong ship.",
      }),
      "attempts_game_id_action_id_actions_game_id_id_fk",
    );
  });

  it("sets ended_at exactly when the game is over", async () => {
    const { game } = await playerWithGame();
    await expectViolation(
      db.update(games).set({ status: "won" }).where(eq(games.id, game.id)),
      "games_ended_at_iff_over",
    );
  });
});

describe("busy claim (FR-028)", () => {
  it("lets exactly one of two concurrent claims win", async () => {
    const { game } = await playerWithGame();
    const results = await Promise.all([claimBusy(game.id), claimBusy(game.id)]);
    expect(results.filter((token) => token !== null)).toHaveLength(1);
  });

  it("can be taken over once stale (older than 60 s)", async () => {
    const { game } = await playerWithGame();
    expect(await claimBusy(game.id)).not.toBeNull();
    expect(await claimBusy(game.id)).toBeNull();

    await db
      .update(games)
      .set({ busySince: sql`now() - interval '61 seconds'` })
      .where(eq(games.id, game.id));
    expect(await claimBusy(game.id)).not.toBeNull();
  });

  it("can be claimed again once released", async () => {
    const { game } = await playerWithGame();
    const token = await claimBusy(game.id);
    if (token === null) throw new Error("claim failed");
    await releaseBusy(game.id, token);
    expect(await claimBusy(game.id)).not.toBeNull();
  });

  it("can't be claimed once the game is over", async () => {
    const { game } = await playerWithGame();
    await db
      .update(games)
      .set({ status: "lost", endedAt: sql`now()` })
      .where(eq(games.id, game.id));
    expect(await claimBusy(game.id)).toBeNull();
  });

  it("commits an attempt with seq = max + 1 and releases the claim", async () => {
    const { playerId, game } = await playerWithGame();
    for (const slug of ["horn", "engine"]) {
      const token = await claimBusy(game.id);
      if (token === null) throw new Error("claim failed");
      const committed = await commitAttempt(game.id, token, {
        ...WRONG_ATTEMPT,
        scenarioId: game.firstScenario.id,
        actionId: action(game, slug).id,
      });
      expect(committed).toBe(true);
    }

    const record = await loadGame(playerId);
    expect(record?.attempts.map((attempt) => attempt.seq)).toEqual([1, 2]);
    expect(record?.game.busySince).toBeNull();
  });

  it("resolves the scenario and ends the game in the same commit", async () => {
    const { playerId, game } = await playerWithGame();
    const token = await claimBusy(game.id);
    if (token === null) throw new Error("claim failed");

    await commitAttempt(game.id, token, {
      ...WRONG_ATTEMPT,
      outcome: "resolved",
      resolvesScenario: true,
      gameStatus: "won",
      scenarioId: game.firstScenario.id,
      actionId: game.firstScenario.correctActionId,
    });

    const record = await loadGame(playerId);
    expect(record?.scenarios[0]?.resolvedAt).not.toBeNull();
    expect(record?.game.status).toBe("won");
    expect(record?.game.endedAt).not.toBeNull();
  });

  it("writes nothing when the claim was stolen after going stale", async () => {
    const { playerId, game } = await playerWithGame();
    const stale = await claimBusy(game.id);
    if (stale === null) throw new Error("claim failed");
    await db
      .update(games)
      .set({ busySince: sql`now() - interval '61 seconds'` })
      .where(eq(games.id, game.id));
    const thief = await claimBusy(game.id);
    expect(thief).not.toBeNull();

    const committed = await commitAttempt(game.id, stale, {
      ...WRONG_ATTEMPT,
      scenarioId: game.firstScenario.id,
      actionId: action(game, "horn").id,
    });

    expect(committed).toBe(false);
    const record = await loadGame(playerId);
    expect(record?.attempts).toEqual([]);
    expect(record?.game.busySince).toEqual(thief);
  });
});
