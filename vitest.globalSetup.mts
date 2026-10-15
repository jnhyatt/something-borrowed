import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import type { TestProject } from "vitest/node";

/** Brings the test database (`test.env.DATABASE_URL`) up to the latest migration. */
export default async function setup(project: TestProject) {
  const url = project.config.env.DATABASE_URL;
  if (!url) throw new Error("test.env.DATABASE_URL is not set");

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
}
