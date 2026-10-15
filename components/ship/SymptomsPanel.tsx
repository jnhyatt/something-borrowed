/** The diagnostic screen. Amber on black in both themes. */
export function SymptomsPanel() {
  return (
    <section
      aria-label="Diagnostics"
      className="rounded-plate border-panel-edge bg-screen border-4 shadow-[inset_0_0_24px_rgb(0_0_0/0.6)]"
    >
      <div className="scanlines text-phosphor flex flex-col gap-2 p-4 font-mono">
        <p className="text-sm tracking-[0.08em] uppercase opacity-80">
          Diagnostics
        </p>
        <p className="text-lg">All systems nominal&hellip; for now.</p>
      </div>
    </section>
  );
}
