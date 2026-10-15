import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FormState } from "@/lib/actions/formState";
import { StatefulForm } from "./StatefulForm";

const ERROR: FormState = {
  status: "error",
  code: "generation-failed",
  message: "Can't get a response from OpenRouter, try again later",
};

type FormActionMock = (prev: FormState, form: FormData) => Promise<FormState>;

function renderForm(action: FormActionMock) {
  render(
    <StatefulForm action={action} submitLabel="Try it" pendingLabel="Working…">
      <input name="email" aria-label="Email" defaultValue="pilot@example.com" />
    </StatefulForm>,
  );
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Try it" }));
  });
}

describe("StatefulForm", () => {
  it("shows no error before submitting", () => {
    renderForm(async () => ERROR);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sends the fields to the action and shows the returned error", async () => {
    const action = vi.fn<FormActionMock>().mockResolvedValue(ERROR);
    renderForm(action);

    await submit();

    expect((await screen.findByRole("alert")).textContent).toBe(ERROR.message);
    expect(action.mock.calls[0]?.[1].get("email")).toBe("pilot@example.com");
  });

  it("can retry, and clears the error when the retry succeeds", async () => {
    const action = vi
      .fn<FormActionMock>()
      .mockResolvedValueOnce(ERROR)
      .mockResolvedValueOnce({ status: "idle" });
    renderForm(action);

    await submit();
    await screen.findByRole("alert");
    await submit();

    expect(action).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
