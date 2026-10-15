import type { AttemptView } from "@/lib/game/types";
import { LogEntry } from "./LogEntry";

type ShipLogProps = { attempts: AttemptView[] };

/** Every attempt in order, grouped by leg (FR-031). */
export function ShipLog({ attempts }: ShipLogProps) {
  if (attempts.length === 0) {
    return (
      <p className="text-ink-muted">
        Nothing&apos;s gone wrong yet. Give it a minute.
      </p>
    );
  }

  const legs = [...new Set(attempts.map((attempt) => attempt.leg))];

  return (
    <div className="flex flex-col gap-6">
      {legs.map((leg) => (
        <section
          key={leg}
          aria-labelledby={`leg-${leg}`}
          className="flex flex-col gap-3"
        >
          <h2
            id={`leg-${leg}`}
            className="font-mono text-sm tracking-[0.08em] uppercase"
          >
            Leg {leg}
          </h2>
          <ol className="flex flex-col gap-3">
            {attempts
              .filter((attempt) => attempt.leg === leg)
              .map((attempt) => (
                <LogEntry key={attempt.order} attempt={attempt} />
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
