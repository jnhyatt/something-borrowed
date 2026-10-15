"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { toSafeNextPath } from "@/lib/auth/nextPath";
import * as authService from "@/lib/server/authService";
import type { FormState } from "./formState";

const credentialsSchema = z.object({
  email: z.email(),
  // Better Auth's default limits.
  password: z.string().min(8).max(128),
});

const SIGN_UP_ERROR: FormState = {
  status: "error",
  code: "invalid-input",
  message:
    "Couldn't create that account. Use a valid email and a password of 8+ characters.",
};

const SIGN_IN_ERROR: FormState = {
  status: "error",
  code: "invalid-input",
  message: "That email and password don't match an account.",
};

function readCredentials(form: FormData) {
  return credentialsSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
}

export async function signUp(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const credentials = readCredentials(form);
  if (!credentials.success) return SIGN_UP_ERROR;

  const result = await authService.signUp(credentials.data);
  if (!result.ok) return SIGN_UP_ERROR;

  redirect(toSafeNextPath(form.get("next")));
}

export async function signIn(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const credentials = readCredentials(form);
  if (!credentials.success) return SIGN_IN_ERROR;

  const result = await authService.signIn(credentials.data);
  if (!result.ok) return SIGN_IN_ERROR;

  redirect(toSafeNextPath(form.get("next")));
}

export async function signOut(): Promise<void> {
  await authService.signOut();
  redirect("/");
}
