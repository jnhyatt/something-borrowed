import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Better Auth's tables. Property names are the field names Better Auth expects.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Game tables. specs/001-junker-ship-game/data-model.md is the reference; keep them in sync.
// Every child table's foreign keys include game_id, so a row can only point at its own game.

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const shipArea = pgEnum("ship_area", [
  "piloting",
  "engine-room",
  "life-support",
]);
export const actionVerb = pgEnum("action_verb", ["do", "set", "remove"]);
export const gameStatus = pgEnum("game_status", ["in_progress", "won", "lost"]);
export const attemptOutcome = pgEnum("attempt_outcome", [
  "resolved",
  "continued",
  "game_over",
]);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // One game per player (FR-003).
    playerId: text("player_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    status: gameStatus("status").notNull().default("in_progress"),
    // Claim held while an LLM call runs (FR-028).
    busySince: timestamptz("busy_since"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    endedAt: timestamptz("ended_at"),
  },
  (table) => [
    check(
      "games_ended_at_iff_over",
      sql`(${table.status} = 'in_progress') = (${table.endedAt} IS NULL)`,
    ),
  ],
);

export const actions = pgTable(
  "actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    area: shipArea("area").notNull(),
    slug: text("slug").notNull(),
    verb: actionVerb("verb").notNull(),
    label: text("label").notNull(),
    // Display order within its area.
    position: smallint("position").notNull(),
  },
  (table) => [
    check(
      "actions_slug_format",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(${table.slug}) <= 48`,
    ),
    check("actions_label_length", sql`length(${table.label}) BETWEEN 1 AND 80`),
    // FR-013
    unique().on(table.gameId, table.verb, table.area, table.slug),
    unique().on(table.gameId, table.id),
  ],
);

export const scenarios = pgTable(
  "scenarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    leg: smallint("leg").notNull(),
    symptoms: text("symptoms").notNull(),
    correctActionId: uuid("correct_action_id").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    // Null while the scenario is active.
    resolvedAt: timestamptz("resolved_at"),
  },
  (table) => [
    check("scenarios_leg_range", sql`${table.leg} BETWEEN 1 AND 3`),
    unique().on(table.gameId, table.leg),
    // FR-018
    unique().on(table.gameId, table.correctActionId),
    unique().on(table.gameId, table.id),
    foreignKey({
      columns: [table.gameId, table.correctActionId],
      foreignColumns: [actions.gameId, actions.id],
    }),
    uniqueIndex("scenarios_one_active")
      .on(table.gameId)
      .where(sql`${table.resolvedAt} IS NULL`),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id").notNull(),
    scenarioId: uuid("scenario_id").notNull(),
    actionId: uuid("action_id").notNull(),
    // Order within the game (FR-031).
    seq: integer("seq").notNull(),
    outcome: attemptOutcome("outcome").notNull(),
    resultText: text("result_text").notNull(),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (table) => [
    check("attempts_seq_positive", sql`${table.seq} >= 1`),
    unique().on(table.gameId, table.seq),
    // FR-026
    unique().on(table.scenarioId, table.actionId),
    foreignKey({
      columns: [table.gameId, table.scenarioId],
      foreignColumns: [scenarios.gameId, scenarios.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.gameId, table.actionId],
      foreignColumns: [actions.gameId, actions.id],
    }).onDelete("cascade"),
  ],
);
