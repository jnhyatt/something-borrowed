CREATE TYPE "public"."action_verb" AS ENUM('do', 'set', 'remove');--> statement-breakpoint
CREATE TYPE "public"."attempt_outcome" AS ENUM('resolved', 'continued', 'game_over');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('in_progress', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."ship_area" AS ENUM('piloting', 'engine-room', 'life-support');--> statement-breakpoint
CREATE TABLE "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"area" "ship_area" NOT NULL,
	"slug" text NOT NULL,
	"verb" "action_verb" NOT NULL,
	"label" text NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "actions_game_id_verb_area_slug_unique" UNIQUE("game_id","verb","area","slug"),
	CONSTRAINT "actions_game_id_id_unique" UNIQUE("game_id","id"),
	CONSTRAINT "actions_slug_format" CHECK ("actions"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("actions"."slug") <= 48),
	CONSTRAINT "actions_label_length" CHECK (length("actions"."label") BETWEEN 1 AND 80)
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"scenario_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"outcome" "attempt_outcome" NOT NULL,
	"result_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_game_id_seq_unique" UNIQUE("game_id","seq"),
	CONSTRAINT "attempts_scenario_id_action_id_unique" UNIQUE("scenario_id","action_id"),
	CONSTRAINT "attempts_seq_positive" CHECK ("attempts"."seq" >= 1)
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" text NOT NULL,
	"status" "game_status" DEFAULT 'in_progress' NOT NULL,
	"busy_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "games_player_id_unique" UNIQUE("player_id"),
	CONSTRAINT "games_ended_at_iff_over" CHECK (("games"."status" = 'in_progress') = ("games"."ended_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"leg" smallint NOT NULL,
	"symptoms" text NOT NULL,
	"correct_action_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "scenarios_game_id_leg_unique" UNIQUE("game_id","leg"),
	CONSTRAINT "scenarios_game_id_correct_action_id_unique" UNIQUE("game_id","correct_action_id"),
	CONSTRAINT "scenarios_game_id_id_unique" UNIQUE("game_id","id"),
	CONSTRAINT "scenarios_leg_range" CHECK ("scenarios"."leg" BETWEEN 1 AND 3)
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_game_id_scenario_id_scenarios_game_id_id_fk" FOREIGN KEY ("game_id","scenario_id") REFERENCES "public"."scenarios"("game_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_game_id_action_id_actions_game_id_id_fk" FOREIGN KEY ("game_id","action_id") REFERENCES "public"."actions"("game_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_game_id_correct_action_id_actions_game_id_id_fk" FOREIGN KEY ("game_id","correct_action_id") REFERENCES "public"."actions"("game_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scenarios_one_active" ON "scenarios" USING btree ("game_id") WHERE "scenarios"."resolved_at" IS NULL;