import { AREAS } from "@/lib/game/areas";
import { AreaNavLink } from "./AreaNavLink";

export function AreaNav() {
  return (
    <nav aria-label="Ship areas">
      <ul className="flex flex-wrap gap-2">
        {AREAS.map((area) => (
          <li key={area.slug}>
            <AreaNavLink href={`/${area.slug}`}>{area.name}</AreaNavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
