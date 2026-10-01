import type { ReactNode } from "react";

type BadgeVariant = "flavor" | "ok" | "warning" | "danger";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  flavor: "bg-tape px-3 py-0.5 font-marker text-tape-ink",
  ok: "rounded-plate bg-ok px-2 py-0.5 font-mono text-sm text-panel uppercase",
  warning:
    "rounded-plate bg-warning px-2 py-0.5 font-mono text-sm text-tape-ink uppercase",
  danger:
    "rounded-plate bg-danger px-2 py-0.5 font-mono text-sm text-panel uppercase",
};

type BadgeProps = { variant?: BadgeVariant; children: ReactNode };

export function Badge({ variant = "flavor", children }: BadgeProps) {
  return (
    <span className={`inline-block ${VARIANT_CLASSES[variant]}`}>
      {children}
    </span>
  );
}
