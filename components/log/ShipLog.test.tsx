import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AttemptView } from "@/lib/game/types";
import { ShipLog } from "./ShipLog";

function attempt(overrides: Partial<AttemptView>): AttemptView {
  return {
    order: 1,
    leg: 1,
    actionLabel: "Honk the horn",
    area: "piloting",
    outcome: "continued",
    text: "Honk. Nothing happens.",
    ...overrides,
  };
}

describe("ShipLog", () => {
  it("shows the empty state before anything is tried", () => {
    render(<ShipLog attempts={[]} />);
    expect(
      screen.getByText("Nothing's gone wrong yet. Give it a minute."),
    ).toBeDefined();
  });

  it("groups attempts by leg, in order, with outcomes in words", () => {
    render(
      <ShipLog
        attempts={[
          attempt({ order: 1 }),
          attempt({
            order: 2,
            actionLabel: "Crank the coolant valve",
            area: "engine-room",
            outcome: "resolved",
          }),
          attempt({ order: 3, leg: 2, actionLabel: "Kick the engine" }),
        ]}
      />,
    );

    const leg1 = screen.getByRole("region", { name: "Leg 1" });
    const entries = within(leg1).getAllByRole("listitem");
    expect(entries.map((entry) => entry.textContent)).toEqual([
      expect.stringContaining("Honk the horn"),
      expect.stringContaining("Crank the coolant valve"),
    ]);
    expect(entries[0]?.textContent).toContain("Still broken");
    expect(entries[1]?.textContent).toContain("Fixed");
    expect(
      within(screen.getByRole("region", { name: "Leg 2" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(1);
  });
});
