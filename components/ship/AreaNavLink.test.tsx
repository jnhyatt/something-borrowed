import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AreaNavLink } from "./AreaNavLink";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("AreaNavLink", () => {
  beforeEach(() => {
    navigation.pathname = "/";
  });

  it("marks the link for the current area with aria-current=page", () => {
    navigation.pathname = "/engine-room";
    render(<AreaNavLink href="/engine-room">Engine Room</AreaNavLink>);
    const link = screen.getByRole("link", { name: "Engine Room" });
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("leaves other areas unmarked", () => {
    navigation.pathname = "/piloting";
    render(<AreaNavLink href="/engine-room">Engine Room</AreaNavLink>);
    const link = screen.getByRole("link", { name: "Engine Room" });
    expect(link.getAttribute("aria-current")).toBeNull();
    expect(link.getAttribute("href")).toBe("/engine-room");
  });
});
