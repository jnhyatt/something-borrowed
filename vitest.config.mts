import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// DB integration and service tests run against this database, never the dev one. Playwright
// uses it too; every test makes its own players, so they don't collide.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/something_borrowed_test";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // Outside React Server Components `server-only` throws on import; tests run lib/server
      // and lib/db directly, so give them the empty build Next uses on the server.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "e2e/**", ".next*/**"],
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./vitest.globalSetup.mts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      BETTER_AUTH_SECRET: "vitest-only-secret-not-for-real-use-0123456789",
      BETTER_AUTH_URL: "http://localhost:3000",
      AI_PROVIDER: "fake",
    },
  },
});
