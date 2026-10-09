// Helpers for tests that run against the test database (see vitest.config.mts).
import { inArray } from "drizzle-orm";
import { FIXTURE_ACTIONS, FIXTURE_CORRECT_SLUGS } from "@/lib/game/testing";
import type { Action } from "@/lib/game/types";
import { db } from "./client";
import type { NewGame } from "./gameRepo";
import { user } from "./schema";

/** Makes real `user` rows, and deletes them (cascading to their games) on cleanup. */
export function createPlayerPool() {
  const ids: string[] = [];
  return {
    async create(): Promise<string> {
      const id = crypto.randomUUID();
      await db
        .insert(user)
        .values({ id, name: "Test pilot", email: `pilot-${id}@example.com` });
      ids.push(id);
      return id;
    },
    async cleanup(): Promise<void> {
      if (ids.length > 0) await db.delete(user).where(inArray(user.id, ids));
    },
  };
}

/** A storable game made from the fixture actions, with fresh UUIDs; leg 1 is active. */
export function buildNewGame(): NewGame & {
  actionBySlug: Map<string, Action>;
} {
  const id = crypto.randomUUID();
  const actions = FIXTURE_ACTIONS.map((action) => ({
    ...action,
    id: crypto.randomUUID(),
    gameId: id,
  }));
  const actionBySlug = new Map(actions.map((action) => [action.slug, action]));
  const correct = actionBySlug.get(FIXTURE_CORRECT_SLUGS[1]);
  if (correct === undefined) throw new Error("Fixture lacks leg 1's fix");

  return {
    id,
    actions,
    firstScenario: {
      id: crypto.randomUUID(),
      symptoms: "The junker is wheezing like an accordion with a cold.",
      correctActionId: correct.id,
    },
    actionBySlug,
  };
}
