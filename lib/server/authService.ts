import "server-only";
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { ServiceResult } from "@/lib/game/types";

export type Credentials = { email: string; password: string };

const OK: ServiceResult = { ok: true, value: undefined };
const INVALID_INPUT: ServiceResult = { ok: false, code: "invalid-input" };

// Better Auth rejects bad credentials and taken emails with an APIError. Both become
// `invalid-input`, so callers can't tell whether an email is registered.

export async function signUp({
  email,
  password,
}: Credentials): Promise<ServiceResult> {
  try {
    await auth.api.signUpEmail({
      body: { email, password, name: email.split("@")[0] ?? email },
      headers: await headers(),
    });
    return OK;
  } catch (error) {
    if (isAPIError(error)) return INVALID_INPUT;
    throw error;
  }
}

export async function signIn({
  email,
  password,
}: Credentials): Promise<ServiceResult> {
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    return OK;
  } catch (error) {
    if (isAPIError(error)) return INVALID_INPUT;
    throw error;
  }
}

export async function signOut(): Promise<ServiceResult> {
  await auth.api.signOut({ headers: await headers() });
  return OK;
}
