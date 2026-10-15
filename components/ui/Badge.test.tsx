import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its text label", () => {
    render(<Badge variant="danger">Game over</Badge>);
    expect(screen.getByText("Game over")).toBeDefined();
  });
});
