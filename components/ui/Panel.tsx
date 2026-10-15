import type { ComponentProps } from "react";

type PanelProps = ComponentProps<"div">;

/** A flat bulkhead plate. */
export function Panel({ className, ...props }: PanelProps) {
  return (
    <div
      {...props}
      className={`rounded-plate border-panel-edge bg-panel border-2 p-5 ${className ?? ""}`}
    />
  );
}
