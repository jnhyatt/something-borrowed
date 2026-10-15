import { expect, test } from "@playwright/test";
import { FAKE_LABELS, signUp, startGame } from "./helpers";

test("borrowing the junker starts leg 1 with symptoms and actions everywhere", async ({
  page,
}) => {
  await signUp(page);
  await page.getByRole("button", { name: "Borrow the junker" }).click();

  await expect(page).toHaveURL("/piloting");
  await expect(page.getByText("Leg 1 of 3")).toBeVisible();
  await expect(page.getByRole("region", { name: "Diagnostics" })).toContainText(
    "gauge",
  );

  const nav = page.getByRole("navigation", { name: "Ship areas" });
  for (const area of ["Piloting", "Engine Room", "Life Support"]) {
    await nav.getByRole("link", { name: area }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: area }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Actions" }).getByRole("listitem"),
    ).toHaveCount(4);
  }
});

test("a wrong action hints and becomes Tried; the coolant valve fixes leg 1", async ({
  page,
}) => {
  await signUp(page);
  await startGame(page);
  const latest = page.getByRole("status", { name: "Latest result" });

  await page.goto("/engine-room");
  await page.getByRole("button", { name: FAKE_LABELS.kickEngine }).click();
  await expect(latest).toContainText("Still broken");
  await expect(latest).toContainText("somewhere else");
  const kicked = page
    .getByRole("listitem")
    .filter({ hasText: FAKE_LABELS.kickEngine });
  await expect(kicked).toContainText("Tried");
  await expect(kicked.getByRole("button")).toHaveCount(0);

  await page.getByRole("button", { name: FAKE_LABELS.coolantValve }).click();
  await expect(latest).toContainText("Fixed");
  // Between legs, nothing can be taken until the player continues.
  await expect(
    page.getByRole("list", { name: "Actions" }).getByRole("button"),
  ).toHaveCount(0);
});

test("a failed generation shows the error and records nothing", async ({
  page,
}) => {
  await signUp(page);
  await startGame(page);

  await page.goto("/life-support");
  await page.getByRole("button", { name: FAKE_LABELS.jiggleTheHandle }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Can't get a response" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Latest result" }),
  ).toContainText("Nothing tried yet");
});

test("continue to leg 2 after a fix, and the log fills up", async ({
  page,
}) => {
  await signUp(page);
  await startGame(page);

  await page.goto("/log");
  await expect(
    page.getByText("Nothing's gone wrong yet. Give it a minute."),
  ).toBeVisible();

  await page.goto("/piloting");
  await page.getByRole("button", { name: "Honk the horn" }).click();
  await expect(page.getByText("Still broken")).toBeVisible();
  await page.goto("/engine-room");
  await page.getByRole("button", { name: FAKE_LABELS.coolantValve }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Leg 2 of 3")).toBeVisible();
  await expect(page.getByRole("region", { name: "Diagnostics" })).toContainText(
    "wheezing",
  );
  // Tried markers reset with the new leg.
  await expect(page.getByText("Tried")).toHaveCount(0);

  await page.getByRole("link", { name: "Ship log" }).click();
  const leg1 = page.getByRole("region", { name: "Leg 1" });
  await expect(leg1.getByRole("listitem")).toHaveCount(2);
  await expect(leg1.getByRole("listitem").first()).toContainText(
    "Honk the horn",
  );
  await expect(leg1.getByRole("listitem").last()).toContainText("Fixed");
});

test.describe("endings", () => {
  test("win with the three fixes, then borrow the junker again", async ({
    page,
  }) => {
    await signUp(page);
    await startGame(page);
    const fixes = [
      ["/engine-room", FAKE_LABELS.coolantValve],
      ["/life-support", FAKE_LABELS.airFilter],
      ["/piloting", FAKE_LABELS.rebootNavComputer],
    ] as const;

    for (const [index, [area, label]] of fixes.entries()) {
      await page.goto(area);
      await page.getByRole("button", { name: label }).click();
      await expect(
        page.getByRole("status", { name: "Latest result" }),
      ).toContainText("Fixed");
      if (index < fixes.length - 1) {
        await page.getByRole("button", { name: "Continue" }).click();
        await expect(page.getByText(`Leg ${index + 2} of 3`)).toBeVisible();
      }
    }

    // The finished game stays viewable, read-only.
    await expect(page.getByRole("region", { name: "Diagnostics" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("list", { name: "Actions" }).getByRole("button"),
    ).toHaveCount(0);

    await page.getByRole("link", { name: "See how it ended" }).click();
    await expect(
      page.getByRole("heading", { name: "You made it to the wedding" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Read the ship log" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Borrow the junker" }).click();
    await expect(page).toHaveURL("/piloting");
    await expect(page.getByText("Leg 1 of 3")).toBeVisible();
    await expect(page.getByText("Nothing tried yet")).toBeVisible();
  });

  test("lose with the reactor shielding, then borrow again", async ({
    page,
  }) => {
    await signUp(page);
    await startGame(page);

    await page.goto("/engine-room");
    await page
      .getByRole("button", { name: FAKE_LABELS.reactorShielding })
      .click();
    await expect(
      page.getByRole("status", { name: "Latest result" }),
    ).toContainText("Game over");
    await expect(
      page.getByRole("list", { name: "Actions" }).getByRole("button"),
    ).toHaveCount(0);

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Towed to the scrapyard" }),
    ).toBeVisible();
    await expect(page.getByText("scrapyard.")).toBeVisible();

    await page.getByRole("button", { name: "Borrow the junker" }).click();
    await expect(page).toHaveURL("/piloting");
    await expect(page.getByText("Nothing tried yet")).toBeVisible();
  });

  test("mid-trip, home offers to resume or start over", async ({ page }) => {
    await signUp(page);
    await startGame(page);
    await page.getByRole("button", { name: "Honk the horn" }).click();
    await expect(page.getByText("Still broken")).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("Leg 1 of 3")).toBeVisible();
    await expect(
      page.getByText("Your current game will be lost."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to the ship" }).click();
    await expect(page.getByText("Still broken")).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page).toHaveURL("/piloting");
    await expect(page.getByText("Nothing tried yet")).toBeVisible();
  });
});
