import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/something_borrowed_test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `drizzle-kit migrate && next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // A separate build directory lets this run alongside a regular `npm run dev`;
    // Next 16 locks each build directory to one dev server.
    // These override .env.local, so e2e never touches the dev database.
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATABASE_URL: TEST_DATABASE_URL,
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-only-secret-not-for-real-use-0123456789",
    },
  },
});
