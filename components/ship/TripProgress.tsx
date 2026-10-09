import type { Leg } from "@/lib/game/types";

const LEGS: Leg[] = [1, 2, 3];

type TripProgressProps = { leg: Leg };

/** "Leg 2 of 3", with a pip per jump. */
export function TripProgress({ leg }: TripProgressProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm tracking-[0.08em] uppercase">
      <p>
        Leg {leg} of {LEGS.length}
      </p>
      <span aria-hidden className="flex gap-1">
        {LEGS.map((pip) => (
          <span
            key={pip}
            className={`border-rust-deep size-3 rounded-full border-2 ${pip <= leg ? "bg-rust" : ""}`}
          />
        ))}
      </span>
    </div>
  );
}
