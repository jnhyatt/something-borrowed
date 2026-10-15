import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";

type PremiseProps = { children?: ReactNode };

export function Premise({ children }: PremiseProps) {
  return (
    <Panel className="flex flex-col gap-5 px-6 py-8 sm:px-10">
      <div className="flex flex-col items-start gap-3">
        <Badge>Reminder: top off coolant.</Badge>
        <h1 className="font-display text-4xl leading-tight">
          Something Borrowed
        </h1>
      </div>
      <div className="flex flex-col gap-3 text-lg">
        <p>
          Your best friend is getting married today. You forgot. The wedding is
          three jumps away, and your own ship is up on blocks in the shop.
        </p>
        <p>
          There&apos;s only one option. Your uncle&apos;s junker still runs
          (technically), and he&apos;s willing to loan it to you (&quot;without
          warantee, express or implied&quot;). Surely it can make the trip in
          one piece.
        </p>
        <p className="text-ink-muted">What could go wrong?</p>
      </div>
      {children}
    </Panel>
  );
}
