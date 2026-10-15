import Link from "next/link";
import { SignOutForm } from "@/components/auth/SignOutForm";
import type { Leg } from "@/lib/game/types";
import { TripProgress } from "./TripProgress";

type ShipHeaderProps = { leg: Leg };

export function ShipHeader({ leg }: ShipHeaderProps) {
  return (
    <header className="border-panel-edge flex flex-wrap items-center justify-between gap-3 border-b-2 pb-3">
      <div className="flex flex-col gap-1">
        <Link href="/" className="font-display text-ink text-xl">
          Something Borrowed
        </Link>
        <TripProgress leg={leg} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/log"
          className="text-rust font-mono text-sm tracking-[0.08em] uppercase underline"
        >
          Ship log
        </Link>
        <SignOutForm />
      </div>
    </header>
  );
}
