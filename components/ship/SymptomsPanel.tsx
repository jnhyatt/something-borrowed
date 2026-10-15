import { Badge } from "@/components/ui/Badge";

type SymptomsPanelProps = { symptoms: string; isFixed: boolean };

/** The diagnostic screen. Amber on black in both themes. */
export function SymptomsPanel({ symptoms, isFixed }: SymptomsPanelProps) {
  return (
    <section
      aria-label="Diagnostics"
      className="rounded-plate border-panel-edge bg-screen border-4 shadow-[inset_0_0_24px_rgb(0_0_0/0.6)]"
    >
      <div className="text-phosphor flex flex-col gap-2 p-4 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm tracking-[0.08em] uppercase opacity-80">
            Diagnostics
          </p>
          {isFixed && <Badge variant="ok">Fixed</Badge>}
        </div>
        <p className={`text-lg ${isFixed ? "opacity-70" : ""}`}>{symptoms}</p>
      </div>
    </section>
  );
}
