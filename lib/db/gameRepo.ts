import "server-only";
import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { BUSY_CLAIM_TIMEOUT_MS } from "@/lib/game/gameView";
import type { AttemptCommit } from "@/lib/game/attempts";
import type { Action, GameRecord, Leg, Scenario } from "@/lib/game/types";
import { db } from "./client";
import { actions, attempts, games, scenarios } from "./schema";

// Claims are timed by Postgres's clock (research.md §3), never the app server's.
const claimCutoff = sql`now() - make_interval(secs => ${BUSY_CLAIM_TIMEOUT_MS / 1000})`;

// No claim, or one that has gone stale.
const isClaimable = or(
  isNull(games.busySince),
  lt(games.busySince, claimCutoff),
);

const LEGS: readonly Leg[] = [1, 2, 3];

function toLeg(value: number): Leg {
  const leg = LEGS.find((candidate) => candidate === value);
  // The scenarios_leg_range CHECK makes this unreachable.
  if (leg === undefined) throw new Error(`Invalid leg: ${value}`);
  return leg;
}

/** The player's whole game, read from one snapshot, or null if they have none. */
export async function loadGame(playerId: string): Promise<GameRecord | null> {
  return db.transaction(
    async (tx) => {
      const [game] = await tx
        .select()
        .from(games)
        .where(eq(games.playerId, playerId));
      if (game === undefined) return null;

      const actionRows = await tx
        .select()
        .from(actions)
        .where(eq(actions.gameId, game.id));
      const scenarioRows = await tx
        .select()
        .from(scenarios)
        .where(eq(scenarios.gameId, game.id))
        .orderBy(asc(scenarios.leg));
      const attemptRows = await tx
        .select()
        .from(attempts)
        .where(eq(attempts.gameId, game.id))
        .orderBy(asc(attempts.seq));

      return {
        game,
        actions: actionRows,
        scenarios: scenarioRows.map((row) => ({ ...row, leg: toLeg(row.leg) })),
        attempts: attemptRows,
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export type NewGame = {
  id: string;
  actions: Action[];
  firstScenario: Pick<Scenario, "id" | "symptoms" | "correctActionId">;
};

/**
 * Replaces the player's game with a fully generated new one, in one transaction
 * (research.md §5). Refuses with "busy" while the old game holds a live claim.
 */
export async function replaceGame(
  playerId: string,
  newGame: NewGame,
): Promise<"replaced" | "busy"> {
  return db.transaction(async (tx) => {
    // Serializes replacements for one player, so two tabs starting at once both succeed and
    // the later one wins, even when there's no old row to lock.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${playerId}))`);

    // Delete the old game unless it holds a live claim. The row lock this takes also stops a
    // claim from starting before the transaction commits.
    await tx
      .delete(games)
      .where(and(eq(games.playerId, playerId), isClaimable));
    const [busy] = await tx
      .select({ id: games.id })
      .from(games)
      .where(eq(games.playerId, playerId));
    if (busy !== undefined) return "busy";

    await tx.insert(games).values({ id: newGame.id, playerId });
    await tx.insert(actions).values(newGame.actions);
    await tx
      .insert(scenarios)
      .values({ ...newGame.firstScenario, gameId: newGame.id, leg: 1 });
    return "replaced";
  });
}

/**
 * Proof of a busy claim: the exact `busy_since` it set. Truncated to milliseconds so it
 * survives the round trip through a JS Date and still matches in `WHERE busy_since = $token`.
 */
export type ClaimToken = Date;

/**
 * Claims an in-progress game for one generation (research.md §3, FR-028). Returns null when
 * another live claim holds it or the game is over. A claim older than 60 s is stale and can
 * be taken over.
 */
export async function claimBusy(gameId: string): Promise<ClaimToken | null> {
  const [claimed] = await db
    .update(games)
    .set({ busySince: sql`date_trunc('milliseconds', now())` })
    .where(
      and(eq(games.id, gameId), eq(games.status, "in_progress"), isClaimable),
    )
    .returning({ busySince: games.busySince });
  return claimed?.busySince ?? null;
}

/** Drops the claim if it's still ours. Used when generation fails; nothing else is written. */
export async function releaseBusy(
  gameId: string,
  token: ClaimToken,
): Promise<void> {
  await db
    .update(games)
    .set({ busySince: null })
    .where(and(eq(games.id, gameId), eq(games.busySince, token)));
}

/**
 * Records an attempt and its effects, and releases the claim, in one transaction. Returns
 * false, writing nothing, if the claim is no longer ours (it went stale and was taken).
 */
export async function commitAttempt(
  gameId: string,
  token: ClaimToken,
  attempt: AttemptCommit & { scenarioId: string; actionId: string },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const isOver = attempt.gameStatus !== "in_progress";
    const [held] = await tx
      .update(games)
      .set({
        busySince: null,
        status: attempt.gameStatus,
        endedAt: isOver ? sql`now()` : null,
      })
      .where(and(eq(games.id, gameId), eq(games.busySince, token)))
      .returning({ id: games.id });
    if (held === undefined) return false;

    // Safe without a lock: only the claim holder inserts attempts.
    const [latest] = await tx
      .select({
        seq: sql<number>`coalesce(max(${attempts.seq}), 0)`.mapWith(Number),
      })
      .from(attempts)
      .where(eq(attempts.gameId, gameId));
    await tx.insert(attempts).values({
      gameId,
      scenarioId: attempt.scenarioId,
      actionId: attempt.actionId,
      seq: (latest?.seq ?? 0) + 1,
      outcome: attempt.outcome,
      resultText: attempt.resultText,
    });

    if (attempt.resolvesScenario) {
      await tx
        .update(scenarios)
        .set({ resolvedAt: sql`now()` })
        .where(
          and(
            eq(scenarios.gameId, gameId),
            eq(scenarios.id, attempt.scenarioId),
          ),
        );
    }
    return true;
  });
}

/**
 * Stores the next leg's scenario and releases the claim, in one transaction. Returns false,
 * writing nothing, if the claim is no longer ours.
 */
export async function commitScenario(
  gameId: string,
  token: ClaimToken,
  scenario: Pick<Scenario, "id" | "leg" | "symptoms" | "correctActionId">,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [held] = await tx
      .update(games)
      .set({ busySince: null })
      .where(and(eq(games.id, gameId), eq(games.busySince, token)))
      .returning({ id: games.id });
    if (held === undefined) return false;

    await tx.insert(scenarios).values({ ...scenario, gameId });
    return true;
  });
}
