import { describe, expect, it } from "vitest";
import { AREAS, isAreaSlug, RESERVED_SLUGS } from "./areas";

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("AREAS", () => {
  it("has piloting, engine room and life support, in that order", () => {
    expect(AREAS.map((area) => area.slug)).toEqual([
      "piloting",
      "engine-room",
      "life-support",
    ]);
  });

  it("uses kebab-case slugs that aren't reserved", () => {
    for (const { slug } of AREAS) {
      expect(slug).toMatch(KEBAB_CASE);
      expect(RESERVED_SLUGS).not.toContain(slug);
    }
  });

  it("gives every area a name and a flavor line", () => {
    for (const area of AREAS) {
      expect(area.name.length).toBeGreaterThan(0);
      expect(area.flavor.length).toBeGreaterThan(0);
    }
  });
});

describe("RESERVED_SLUGS", () => {
  it("covers the app's static top-level segments", () => {
    expect(RESERVED_SLUGS).toEqual(
      expect.arrayContaining(["api", "auth", "log"]),
    );
  });
});

describe("isAreaSlug", () => {
  it.each(["piloting", "engine-room", "life-support"])("accepts %s", (slug) => {
    expect(isAreaSlug(slug)).toBe(true);
  });

  it.each([
    ["log"],
    ["Piloting"],
    ["engine_room"],
    [""],
    [undefined],
    [42],
    [["piloting"]],
  ])("rejects %j", (value) => {
    expect(isAreaSlug(value)).toBe(false);
  });
});
