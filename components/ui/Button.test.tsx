import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders a button that defaults to type=button", () => {
    render(<Button>Borrow the junker</Button>);
    const button = screen.getByRole("button", { name: "Borrow the junker" });
    expect(button.getAttribute("type")).toBe("button");
  });
});
