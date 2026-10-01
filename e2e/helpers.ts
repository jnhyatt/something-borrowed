import { expect, type Page } from "@playwright/test";

export const PASSWORD = "correct-horse-battery";

/** A fresh email per call, so tests never share an account. */
export function uniqueEmail(): string {
  return `pilot-${crypto.randomUUID()}@example.com`;
}

/** Signs up a new player through the UI and waits to land on `next` (default `/`). */
export async function signUp(page: Page, next = "/"): Promise<string> {
  const email = uniqueEmail();
  await page.goto(`/auth/signup?${new URLSearchParams({ next })}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(next);
  return email;
}
