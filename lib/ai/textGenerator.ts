import "server-only";
import type {
  ActionSetRequest,
  ResultRequest,
  ScenarioRequest,
} from "@/lib/game/generation";

/**
 * Writes the game's text. Each method returns the provider's raw JSON as `unknown`; the
 * service validates it (lib/game/validateGenerated.ts) whichever provider produced it.
 * Any failure must reject with a `GenerationError`.
 */
export type TextGenerator = {
  actionSet(request: ActionSetRequest): Promise<unknown>;
  scenario(request: ScenarioRequest): Promise<unknown>;
  result(request: ResultRequest): Promise<unknown>;
};

/** Network failure, timeout, bad response, or output that failed validation (FR-027). */
export class GenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GenerationError";
  }
}
