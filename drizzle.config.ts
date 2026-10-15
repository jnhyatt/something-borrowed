import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so load .env.local ourselves. Variables already set in
// the shell win, which is how Playwright points migrations at the test database.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local; rely on the shell environment.
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
