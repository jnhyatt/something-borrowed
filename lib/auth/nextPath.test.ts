import { describe, expect, it } from "vitest";
import { toSafeNextPath } from "./nextPath";

describe("toSafeNextPath", () => {
  it.each([
    ["/piloting", "/piloting"],
    ["/engine-room?tab=1#top", "/engine-room?tab=1#top"],
    ["/", "/"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(toSafeNextPath(input)).toBe(expected);
  });

  it.each([
    ["//evil.example"],
    ["/\\evil.example"],
    ["https://evil.example/piloting"],
    ["piloting"],
    [""],
    [undefined],
    [null],
    [["/piloting"]],
  ])("falls back to / for %j", (input) => {
    expect(toSafeNextPath(input)).toBe("/");
  });
});
