import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Globals are off, so React Testing Library can't register its own auto-cleanup.
afterEach(() => {
  cleanup();
});
