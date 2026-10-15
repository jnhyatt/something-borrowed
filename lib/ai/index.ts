import "server-only";
import { env } from "@/lib/env";
import { fakeGenerator } from "./fakeGenerator";
import { GenerationError, type TextGenerator } from "./textGenerator";

export { GenerationError, type TextGenerator } from "./textGenerator";

// TODO(#5): the OpenRouter client. Until then every call fails like an unreachable provider.
const openRouterGenerator: TextGenerator = {
  actionSet: notImplemented,
  scenario: notImplemented,
  result: notImplemented,
};

async function notImplemented(): Promise<never> {
  throw new GenerationError("The OpenRouter provider isn't implemented yet");
}

/** The configured provider. Checked per call, so a misconfigured deploy fails loudly. */
export function getTextGenerator(): TextGenerator {
  if (env.AI_PROVIDER === "openrouter") return openRouterGenerator;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AI_PROVIDER=fake is not allowed in production");
  }
  return fakeGenerator;
}
