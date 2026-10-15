import { TripProgress } from "@/components/ship/TripProgress";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import type { Leg } from "@/lib/game/types";
import { NewGameForm } from "./NewGameForm";

type ResumePanelProps = { leg: Leg };

/** Home for a player mid-trip: get back to the ship, or start over (FR-007). */
export function ResumePanel({ leg }: ResumePanelProps) {
  return (
    <Panel className="flex flex-col gap-5 px-6 py-8 sm:px-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl leading-tight">
          Something Borrowed
        </h1>
        <p className="text-lg">
          You&apos;re mid-trip in your uncle&apos;s junker, and the wedding
          won&apos;t wait.
        </p>
        <TripProgress leg={leg} />
      </div>
      <div>
        <Button href="/piloting">Back to the ship</Button>
      </div>
      <div className="border-panel-edge flex flex-col gap-3 border-t-2 pt-5">
        <p className="text-ink-muted">
          Starting over replaces your current trip with a fresh junker and new
          problems. Your current game will be lost.
        </p>
        <NewGameForm submitLabel="Start over" />
      </div>
    </Panel>
  );
}
