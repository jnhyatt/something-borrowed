"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth/session";
import type { ServiceErrorCode } from "@/lib/game/types";
import * as gameService from "@/lib/server/gameService";
import { IDLE_FORM_STATE, type FormState } from "./formState";

const ERROR_MESSAGES: Record<ServiceErrorCode, string> = {
  "generation-failed": "Can't get a response from OpenRouter, try again later",
  busy: "Your last action is still being worked out. Try again in a moment.",
  "not-allowed":
    "That can't be done right now. Reload to see where things stand.",
  "invalid-input": "That didn't work. Check the form and try again.",
};

function toFormError(code: ServiceErrorCode): FormState {
  return { status: "error", code, message: ERROR_MESSAGES[code] };
}

export async function startNewGame(): Promise<FormState> {
  const { playerId } = await requirePlayer();
  const result = await gameService.startGame(playerId);
  if (!result.ok) return toFormError(result.code);

  redirect("/piloting");
}

export async function takeShipAction(actionId: unknown): Promise<FormState> {
  const { playerId } = await requirePlayer();
  const result = await gameService.takeAction(playerId, actionId);
  if (!result.ok) return toFormError(result.code);

  refresh();
  return IDLE_FORM_STATE;
}

/** Generates the next leg after a fix. Also the retry when that generation fails. */
export async function continueTrip(): Promise<FormState> {
  const { playerId } = await requirePlayer();
  const result = await gameService.startNextLeg(playerId);
  if (!result.ok) return toFormError(result.code);

  refresh();
  return IDLE_FORM_STATE;
}
