import "server-only";
import { cache } from "react";
import {
  GenerationError,
  getTextGenerator,
  type TextGenerator,
} from "@/lib/ai";
import * as gameRepo from "@/lib/db/gameRepo";
import {
  applyResult,
  decideAttempt,
  nextLeg,
  type AttemptDecision,
} from "@/lib/game/attempts";
import {
  buildActionSetRequest,
  buildResultRequest,
  buildScenarioRequest,
  findActionByKey,
} from "@/lib/game/generation";
import { toGameView, VIEW_OUTCOME } from "@/lib/game/gameView";
import type {
  Action,
  AttemptView,
  GameView,
  Leg,
  ServiceResult,
} from "@/lib/game/types";
import {
  parseActionSet,
  parseResult,
  parseScenario,
  type Validation,
} from "@/lib/game/validateGenerated";

export type ActionTaken = {
  outcome: AttemptView["outcome"];
  text: string;
  leg: Leg;
  // True when this action was already tried this scenario; nothing new was recorded.
  repeated: boolean;
};

const OK: ServiceResult = { ok: true, value: undefined };
const BUSY = { ok: false, code: "busy" } as const;
const GENERATION_FAILED = { ok: false, code: "generation-failed" } as const;
const NOT_ALLOWED = { ok: false, code: "not-allowed" } as const;

/** The answer for a decision that needs no generation: a repeat or a refusal. */
function settle(
  decision: Exclude<AttemptDecision, { kind: "new" }>,
  record: { scenarios: { id: string; leg: Leg }[] },
): ServiceResult<ActionTaken> {
  if (decision.kind === "not-allowed") return NOT_ALLOWED;
  const { attempt } = decision;
  const scenario = record.scenarios.find((s) => s.id === attempt.scenarioId);
  if (scenario === undefined) return NOT_ALLOWED;
  return {
    ok: true,
    value: {
      outcome: VIEW_OUTCOME[attempt.outcome],
      text: attempt.resultText,
      leg: scenario.leg,
      repeated: true,
    },
  };
}

/** Unwraps validated output; anything invalid counts as a failed generation (FR-033). */
function expectValid<T>(validation: Validation<T>): T {
  if (!validation.ok) {
    throw new GenerationError(
      `Invalid generated content: ${validation.reason}`,
    );
  }
  return validation.value;
}

/**
 * The game service. Generation always runs before any write, outside any transaction, so a
 * failure leaves the stored game exactly as it was (FR-027, FR-034).
 */
export function createGameService(getGenerator: () => TextGenerator) {
  async function getGameView(playerId: string): Promise<GameView> {
    return toGameView(await gameRepo.loadGame(playerId), new Date());
  }

  async function startGame(playerId: string): Promise<ServiceResult> {
    const generator = getGenerator();
    const gameId = crypto.randomUUID();

    let newGame: gameRepo.NewGame;
    try {
      const specs = expectValid(
        parseActionSet(await generator.actionSet(buildActionSetRequest())),
      );
      const actions: Action[] = specs.map((spec) => ({
        ...spec,
        id: crypto.randomUUID(),
        gameId,
      }));

      const request = buildScenarioRequest(
        { actions, scenarios: [], attempts: [] },
        1,
      );
      const scenario = expectValid(
        parseScenario(await generator.scenario(request), request),
      );
      const correctAction = findActionByKey(actions, scenario.correctActionKey);
      // parseScenario already checked the key exists.
      if (correctAction === undefined) throw new Error("Unknown action key");

      newGame = {
        id: gameId,
        actions,
        firstScenario: {
          id: crypto.randomUUID(),
          symptoms: scenario.symptoms,
          correctActionId: correctAction.id,
        },
      };
    } catch (error) {
      if (error instanceof GenerationError) return GENERATION_FAILED;
      throw error;
    }

    const replaced = await gameRepo.replaceGame(playerId, newGame);
    return replaced === "busy" ? BUSY : OK;
  }

  /** The check order in contracts/service-api.md, "takeAction check order". */
  async function takeAction(
    playerId: string,
    actionId: unknown,
  ): Promise<ServiceResult<ActionTaken>> {
    const record = await gameRepo.loadGame(playerId);
    if (record === null) return NOT_ALLOWED;
    const first = decideAttempt(record, actionId);
    if (first.kind !== "new") return settle(first, record);

    const gameId = record.game.id;
    const token = await gameRepo.claimBusy(gameId);
    if (token === null) {
      // Lost a race: the game may have ended, or this exact action may have just landed.
      const latest = await gameRepo.loadGame(playerId);
      if (latest === null) return NOT_ALLOWED;
      const decision = decideAttempt(latest, actionId);
      return decision.kind === "new" ? BUSY : settle(decision, latest);
    }

    try {
      const current = await gameRepo.loadGame(playerId);
      if (current === null || current.game.id !== gameId) {
        await gameRepo.releaseBusy(gameId, token);
        return NOT_ALLOWED;
      }
      const decision = decideAttempt(current, actionId);
      if (decision.kind !== "new") {
        await gameRepo.releaseBusy(gameId, token);
        return settle(decision, current);
      }

      const request = buildResultRequest(current, decision);
      const result = expectValid(
        parseResult(await getGenerator().result(request)),
      );
      const commit = applyResult(decision, result);

      const committed = await gameRepo.commitAttempt(gameId, token, {
        ...commit,
        scenarioId: decision.scenario.id,
        actionId: decision.action.id,
      });
      if (!committed) return GENERATION_FAILED;

      return {
        ok: true,
        value: {
          outcome: VIEW_OUTCOME[commit.outcome],
          text: commit.resultText,
          leg: commit.leg,
          repeated: false,
        },
      };
    } catch (error) {
      await gameRepo.releaseBusy(gameId, token);
      if (error instanceof GenerationError) return GENERATION_FAILED;
      throw error;
    }
  }

  async function startNextLeg(playerId: string): Promise<ServiceResult> {
    const record = await gameRepo.loadGame(playerId);
    if (record === null || nextLeg(record) === undefined) return NOT_ALLOWED;

    const gameId = record.game.id;
    const token = await gameRepo.claimBusy(gameId);
    if (token === null) return BUSY;

    try {
      // Check again under the claim: another tab may have just started this leg.
      const current = await gameRepo.loadGame(playerId);
      const leg = current?.game.id === gameId ? nextLeg(current) : undefined;
      if (current === null || leg === undefined) {
        await gameRepo.releaseBusy(gameId, token);
        return NOT_ALLOWED;
      }

      const request = buildScenarioRequest(current, leg);
      const scenario = expectValid(
        parseScenario(await getGenerator().scenario(request), request),
      );
      const correctAction = findActionByKey(
        current.actions,
        scenario.correctActionKey,
      );
      // parseScenario already checked the key exists.
      if (correctAction === undefined) throw new Error("Unknown action key");

      const committed = await gameRepo.commitScenario(gameId, token, {
        id: crypto.randomUUID(),
        leg,
        symptoms: scenario.symptoms,
        correctActionId: correctAction.id,
      });
      return committed ? OK : GENERATION_FAILED;
    } catch (error) {
      await gameRepo.releaseBusy(gameId, token);
      if (error instanceof GenerationError) return GENERATION_FAILED;
      throw error;
    }
  }

  return { getGameView, startGame, takeAction, startNextLeg };
}

const service = createGameService(getTextGenerator);

/** Deduplicated per request, since the ship layout and its page both need the view. */
export const getGameView = cache(service.getGameView);
export const { startGame, takeAction, startNextLeg } = service;
