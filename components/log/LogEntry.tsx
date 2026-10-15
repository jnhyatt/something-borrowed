import { OutcomeTag } from "@/components/ship/OutcomeTag";
import { Panel } from "@/components/ui/Panel";
import { getArea } from "@/lib/game/areas";
import type { AttemptView } from "@/lib/game/types";

type LogEntryProps = { attempt: AttemptView };

export function LogEntry({ attempt }: LogEntryProps) {
  return (
    <li>
      <Panel className="flex flex-col gap-2 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            <span className="font-bold">{attempt.actionLabel}</span>{" "}
            <span className="text-ink-muted font-mono text-sm tracking-[0.08em] uppercase">
              {getArea(attempt.area).name}
            </span>
          </p>
          <OutcomeTag outcome={attempt.outcome} />
        </div>
        <p>{attempt.text}</p>
      </Panel>
    </li>
  );
}
