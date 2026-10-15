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

/** From the "/" of a player with no game, starts one and waits for the ship. */
export async function startGame(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Borrow the junker" }).click();
  await expect(page).toHaveURL("/piloting");
}

// Mirrors the fake generator's fixture (lib/ai/fakeGenerator.ts), which e2e can't import
// because it's server-only.
export const FAKE_LABELS = {
  coolantValve: "Crank the coolant valve",
  airFilter: "Pull out the air filter",
  rebootNavComputer: "Reboot the nav computer",
  reactorShielding: "Remove the reactor shielding",
  kickEngine: "Kick the engine",
  jiggleTheHandle: "Jiggle the handle",
} as const;
