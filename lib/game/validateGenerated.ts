// Checks generated content before anything is stored (FR-033). Every response arrives as
// `unknown`. This covers the shape, the database's rules, and the counts in
// contracts/llm-generation.md; the content checks (denylist, symptoms naming the fix) are #6.
import { z } from "zod";
import { AREAS, RESERVED_SLUGS, isAreaSlug, type AreaSlug } from "./areas";
import type { GeneratedResult } from "./attempts";
import {
  ACTION_SET_LIMITS,
  type ActionSpec,
  type ScenarioRequest,
} from "./generation";

export type Validation<T> =
  { ok: true; value: T } | { ok: false; reason: string };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const actionSetSchema = z.object({
  actions: z
    .array(
      z.object({
        area: z.custom<AreaSlug>(isAreaSlug, "unknown area"),
        slug: z
          .string()
          .max(48)
          .regex(SLUG_PATTERN)
          .refine((slug) => !RESERVED_SLUGS.includes(slug), "reserved slug"),
        verb: z.enum(["do", "set", "remove"]),
        label: z.string().trim().min(1).max(80),
      }),
    )
    .min(ACTION_SET_LIMITS.minTotal)
    .max(ACTION_SET_LIMITS.maxTotal),
});

const scenarioSchema = z.object({
  symptoms: z.string().trim().min(40).max(800),
  correctActionKey: z.string(),
});

const resultSchema = z.object({
  resultText: z.string().trim().min(20).max(1200),
  isGameOver: z.boolean(),
});

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

/** Validates an action set and assigns positions in response order within each area. */
export function parseActionSet(raw: unknown): Validation<ActionSpec[]> {
  const parsed = actionSetSchema.safeParse(raw);
  if (!parsed.success) return fail(z.prettifyError(parsed.error));

  const seen = new Set<string>();
  const nextPosition = new Map<string, number>();
  const actions: ActionSpec[] = [];
  for (const action of parsed.data.actions) {
    const address = `${action.verb} /${action.area}/${action.slug}`;
    if (seen.has(address)) return fail(`duplicate action ${address}`);
    seen.add(address);

    const position = nextPosition.get(action.area) ?? 0;
    nextPosition.set(action.area, position + 1);
    actions.push({ ...action, position });
  }

  for (const area of AREAS) {
    if ((nextPosition.get(area.slug) ?? 0) < ACTION_SET_LIMITS.minPerArea) {
      return fail(`too few actions in ${area.slug}`);
    }
  }
  return { ok: true, value: actions };
}

export type GeneratedScenario = { symptoms: string; correctActionKey: string };

/** The correct action must exist and must not have fixed an earlier leg (FR-018). */
export function parseScenario(
  raw: unknown,
  request: ScenarioRequest,
): Validation<GeneratedScenario> {
  const parsed = scenarioSchema.safeParse(raw);
  if (!parsed.success) return fail(z.prettifyError(parsed.error));

  const { correctActionKey } = parsed.data;
  if (!request.actions.some((action) => action.key === correctActionKey)) {
    return fail(`unknown action key ${correctActionKey}`);
  }
  if (
    request.history.some((leg) => leg.correctActionKey === correctActionKey)
  ) {
    return fail(`action ${correctActionKey} already fixed an earlier leg`);
  }
  return { ok: true, value: parsed.data };
}

export function parseResult(raw: unknown): Validation<GeneratedResult> {
  const parsed = resultSchema.safeParse(raw);
  if (!parsed.success) return fail(z.prettifyError(parsed.error));
  return { ok: true, value: parsed.data };
}
