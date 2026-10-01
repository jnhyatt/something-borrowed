import type { ServiceErrorCode } from "@/lib/game/types";

export type FormState =
  | { status: "idle" }
  | { status: "error"; code: ServiceErrorCode; message: string };

export const IDLE_FORM_STATE: FormState = { status: "idle" };

export type FormAction = (
  prev: FormState,
  form: FormData,
) => Promise<FormState>;
