import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});

/** Server environment, validated once at startup (Constitution I: env is untrusted input). */
export const env = envSchema.parse(process.env);
