import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

const AREAS = [
  { path: "/piloting", name: "Piloting" },
  { path: "/engine-room", name: "Engine Room" },
  { path: "/life-support", name: "Life Support" },
];

test.beforeEach(async ({ page }) => {
  await signUp(page);
});

test("clicks through every area with the area nav", async ({ page }) => {
  await page.goto("/piloting");
  const nav = page.getByRole("navigation", { name: "Ship areas" });

  for (const area of [...AREAS].reverse()) {
    await nav.getByRole("link", { name: area.name }).click();
    await expect(page).toHaveURL(area.path);
    await expect(
      page.getByRole("heading", { level: 1, name: area.name }),
    ).toBeVisible();
    await expect(nav.getByRole("link", { name: area.name })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
});

for (const area of AREAS) {
  test(`opens ${area.path} by typed URL`, async ({ page }) => {
    await page.goto(area.path);
    await expect(
      page.getByRole("heading", { level: 1, name: area.name }),
    ).toBeVisible();
    await expect(page.getByText("All systems nominal")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Ship areas" });
    for (const other of AREAS) {
      await expect(nav.getByRole("link", { name: other.name })).toHaveAttribute(
        "href",
        other.path,
      );
    }
  });
}

test("an unknown area is a 404", async ({ page }) => {
  const response = await page.goto("/not-a-room");
  expect(response?.status()).toBe(404);
});
