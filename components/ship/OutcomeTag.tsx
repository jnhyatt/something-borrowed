import { Badge } from "@/components/ui/Badge";
import type { AttemptView } from "@/lib/game/types";

export type Outcome = AttemptView["outcome"] | "tried";

const LABELS: Record<Outcome, string> = {
  tried: "Tried",
  continued: "Still broken",
  resolved: "Fixed",
  "game-over": "Game over",
};

const VARIANTS = {
  tried: "flavor",
  continued: "warning",
  resolved: "ok",
  "game-over": "danger",
} as const;

type OutcomeTagProps = { outcome: Outcome };

/** An outcome in words (FR-042); color only reinforces it. */
export function OutcomeTag({ outcome }: OutcomeTagProps) {
  const tag = <Badge variant={VARIANTS[outcome]}>{LABELS[outcome]}</Badge>;
  if (outcome !== "tried") return tag;

  // "Tried" is a strip of duct tape slapped on at an angle.
  return (
    <span className="tape-ends inline-block -rotate-2 motion-reduce:rotate-0">
      {tag}
    </span>
  );
}
