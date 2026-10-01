import { expect, test } from "@playwright/test";

test("home shows the premise", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Something Borrowed");
  await expect(
    page.getByRole("heading", { level: 1, name: "Something Borrowed" }),
  ).toBeVisible();
  await expect(page.getByText(/junker/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute(
    "href",
    "/auth/signup",
  );
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/auth/login",
  );
});
