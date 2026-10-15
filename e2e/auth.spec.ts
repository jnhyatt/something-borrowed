import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

test("ship pages are gated; sign up, sign out and sign back in", async ({
  page,
}) => {
  await page.goto("/piloting");
  await expect(page).toHaveURL("/auth/login?next=%2Fpiloting");

  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/auth/signup?next=%2Fpiloting");

  const email = uniqueEmail();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page).toHaveURL("/piloting");
  await expect(
    page.getByRole("heading", { level: 1, name: "Piloting" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/engine-room");
  await expect(page).toHaveURL("/auth/login?next=%2Fengine-room");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/engine-room");
});

test("a wrong password or unknown email gets the same generic error", async ({
  page,
}) => {
  const email = uniqueEmail();
  await page.goto("/auth/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  for (const [tryEmail, tryPassword] of [
    [email, "not-the-password"],
    [uniqueEmail(), PASSWORD],
  ]) {
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(tryEmail);
    await page.getByLabel("Password").fill(tryPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    // Next's route announcer is also role="alert", so match on the text.
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "That email and password don't match an account." }),
    ).toBeVisible();
    await expect(page).toHaveURL("/auth/login");
  }
});

test("signed-in players are sent home from the auth pages", async ({
  page,
}) => {
  await page.goto("/auth/signup");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/auth/login");
  await expect(page).toHaveURL("/");
});

test("an off-site next is ignored", async ({ page }) => {
  await page.goto(`/auth/signup?next=${encodeURIComponent("//evil.example/")}`);
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");
});

test("signed-out ship actions get 401 JSON instead of a redirect", async ({
  request,
}) => {
  const response = await request.put("/engine-room/coolant-valve", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(401);
  expect(await response.json()).toMatchObject({ error: "unauthenticated" });
});
