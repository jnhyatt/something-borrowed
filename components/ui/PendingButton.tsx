"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";

type PendingButtonProps = { children: string; pendingLabel: string };

/** A submit button that swaps to `pendingLabel` and blocks resubmits while its form runs. */
export function PendingButton({ children, pendingLabel }: PendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
