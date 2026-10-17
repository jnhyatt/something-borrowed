import "server-only";
import { env } from "@/lib/env";
import { fakeGenerator } from "./fakeGenerator";
import { GenerationError, type TextGenerator } from "./textGenerator";

export { GenerationError, type TextGenerator } from "./textGenerator";

const openRouterGenerator: TextGenerator = {
  actionSet: notImplemented,
  scenario: notImplemented,
  result: notImplemented,
};

async function notImplemented(): Promise<never> {
  throw new GenerationError("The OpenRouter provider isn't implemented yet");
}

export function getTextGenerator(): TextGenerator {
  if (env.AI_PROVIDER === "openrouter") return openRouterGenerator;
  return fakeGenerator;
}
