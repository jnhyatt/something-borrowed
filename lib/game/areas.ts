export const AREAS = [
  {
    slug: "piloting",
    name: "Piloting",
    flavor:
      "A cracked windscreen, fuzzy dice, and more blinking lights than labels.",
  },
  {
    slug: "engine-room",
    name: "Engine Room",
    flavor: "Hot, loud, and smells faintly of burnt toast. Mind the drips.",
  },
  {
    slug: "life-support",
    name: "Life Support",
    flavor: "Keeps the air breathable. Mostly. Please don't kick the scrubber.",
  },
] as const;

export type Area = (typeof AREAS)[number];
export type AreaSlug = Area["slug"];

/**
 * Static top-level route segments. Static segments win over `[area]`, so no area or
 * generated action slug may use one of these.
 */
export const RESERVED_SLUGS: readonly string[] = ["api", "auth", "log"];

export function isAreaSlug(value: unknown): value is AreaSlug {
  return AREAS.some((area) => area.slug === value);
}

export function getArea(slug: AreaSlug): Area {
  const area = AREAS.find((candidate) => candidate.slug === slug);
  // Every AreaSlug comes from AREAS, so the lookup can't miss.
  if (area === undefined) throw new Error(`Unknown area: ${slug}`);
  return area;
}
