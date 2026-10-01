import type { ReactNode } from "react";
import { AreaNav } from "./AreaNav";
import { ShipHeader } from "./ShipHeader";
import { SymptomsPanel } from "./SymptomsPanel";

type ShipShellProps = { children: ReactNode };

/** The frame around every ship page: header, diagnostics, area navigation, then the page. */
export function ShipShell({ children }: ShipShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
      <ShipHeader />
      <SymptomsPanel />
      <AreaNav />
      <main className="flex flex-col gap-4">{children}</main>
    </div>
  );
}
