import type { AreaSlug } from "./areas";

export type { AreaSlug };

export type RequestType = "do" | "set" | "remove";
export type Leg = 1 | 2 | 3;

export type GameStatus = "in_progress" | "won" | "lost";
export type AttemptOutcome = "resolved" | "continued" | "game_over";

export type Game = {
  id: string;
  playerId: string;
  status: GameStatus;
  busySince: Date | null;
  createdAt: Date;
  endedAt: Date | null;
};

export type Action = {
  id: string;
  gameId: string;
  area: AreaSlug;
  slug: string;
  verb: RequestType;
  label: string;
  position: number;
};

export type Scenario = {
  id: string;
  gameId: string;
  leg: Leg;
  symptoms: string;
  correctActionId: string;
  createdAt: Date;
  resolvedAt: Date | null;
};

export type Attempt = {
  id: string;
  gameId: string;
  scenarioId: string;
  actionId: string;
  seq: number;
  outcome: AttemptOutcome;
  resultText: string;
  createdAt: Date;
};

export type GameRecord = {
  game: Game;
  actions: Action[];
  scenarios: Scenario[];
  attempts: Attempt[];
};

export type ActionView = {
  id: string;
  label: string;
  requestType: RequestType;
  area: AreaSlug;
  address: string;
  isTriedThisScenario: boolean;
};

export type AttemptView = {
  order: number;
  leg: Leg;
  actionLabel: string;
  area: AreaSlug;
  outcome: "resolved" | "continued" | "game-over";
  text: string;
};

export type GameView =
  | { status: "none" }
  | {
      status: "in-progress" | "between-legs" | "won" | "lost";
      leg: Leg;
      symptoms: string;
      actions: ActionView[];
      attempts: AttemptView[];
      isEvaluating: boolean;
    };

export type ServiceErrorCode =
  "generation-failed" | "busy" | "not-allowed" | "invalid-input";

export type ServiceResult<T = void> =
  { ok: true; value: T } | { ok: false; code: ServiceErrorCode };
