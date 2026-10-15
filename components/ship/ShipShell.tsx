import type { ReactNode } from "react";
import type { GameView } from "@/lib/game/types";
import { AreaNav } from "./AreaNav";
import { LatestResult } from "./LatestResult";
import { ShipHeader } from "./ShipHeader";
import { SymptomsPanel } from "./SymptomsPanel";

type ShipShellProps = {
  view: Exclude<GameView, { status: "none" }>;
  children: ReactNode;
};

/** The frame around every ship page: header, diagnostics, area navigation, then the page. */
export function ShipShell({ view, children }: ShipShellProps) {
  const isOver = view.status === "won" || view.status === "lost";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
      <ShipHeader leg={view.leg} />
      {!isOver && (
        <SymptomsPanel
          symptoms={view.symptoms}
          isFixed={view.status === "between-legs"}
        />
      )}
      <LatestResult
        attempt={view.attempts.at(-1)}
        next={
          isOver ? "home" : view.status === "between-legs" ? "continue" : null
        }
      />
      <AreaNav />
      <main className="flex flex-col gap-4">{children}</main>
    </div>
  );
}
