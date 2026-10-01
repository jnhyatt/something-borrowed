import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PendingButton } from "./PendingButton";

describe("PendingButton", () => {
  it("shows its label while idle", () => {
    render(
      <form>
        <PendingButton pendingLabel="Consulting the manual…">Go</PendingButton>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Go" });
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("shows the pending label and disables itself while the form is pending", async () => {
    const neverSettles = () => new Promise<void>(() => {});
    render(
      <form action={neverSettles}>
        <PendingButton pendingLabel="Consulting the manual…">Go</PendingButton>
      </form>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Go" }));
    });

    const button = await screen.findByRole("button", {
      name: "Consulting the manual…",
    });
    expect(button.hasAttribute("disabled")).toBe(true);
  });
});
