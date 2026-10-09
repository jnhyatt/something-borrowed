import Link from "next/link";
import { getArea } from "@/lib/game/areas";
import type { AttemptView } from "@/lib/game/types";
import { ContinueForm } from "./ContinueForm";
import { OutcomeTag } from "./OutcomeTag";

const EDGE_CLASSES: Record<AttemptView["outcome"], string> = {
  continued: "border-l-warning",
  resolved: "border-l-ok",
  "game-over": "border-l-danger",
};

type LatestResultProps = {
  attempt: AttemptView | undefined;
  // Between legs the player continues from here; once the game is over, they head home.
  next: "continue" | "home" | null;
};

/** The most recent attempt, from server state, so it survives reloads (research.md §11). */
export function LatestResult({ attempt, next }: LatestResultProps) {
  return (
    <section
      role="status"
      aria-label="Latest result"
      className={`rounded-plate bg-hull border-panel-edge flex flex-col gap-2 border-2 border-l-8 px-4 py-3 ${
        attempt ? EDGE_CLASSES[attempt.outcome] : ""
      }`}
    >
      {attempt ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-sm tracking-[0.08em] uppercase">
              {getArea(attempt.area).name}: {attempt.actionLabel}
            </p>
            <OutcomeTag outcome={attempt.outcome} />
          </div>
          <p className="text-lg">{attempt.text}</p>
          {next === "continue" && <ContinueForm />}
          {next === "home" && (
            <p>
              <Link href="/" className="text-rust underline">
                See how it ended
              </Link>
            </p>
          )}
        </>
      ) : (
        <p className="text-ink-muted">
          Nothing tried yet. Poke around the ship and see what helps.
        </p>
      )}
    </section>
  );
}
