import type { Area } from "@/lib/game/areas";

type AreaHeaderProps = { area: Area };

export function AreaHeader({ area }: AreaHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="font-display text-2xl">{area.name}</h1>
      <p className="text-ink-muted">{area.flavor}</p>
    </header>
  );
}
