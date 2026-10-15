"use client";

import { useActionState, type ReactNode } from "react";
import { IDLE_FORM_STATE, type FormAction } from "@/lib/actions/formState";
import { PendingButton } from "./PendingButton";

type StatefulFormProps = {
  action: FormAction;
  submitLabel: string;
  pendingLabel: string;
  children?: ReactNode;
};

/** A form bound to a Server Action. Fields come from the (server) parent as children. */
export function StatefulForm({
  action,
  submitLabel,
  pendingLabel,
  children,
}: StatefulFormProps) {
  const [state, formAction] = useActionState(action, IDLE_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {children}
      {state.status === "error" && (
        <p role="alert" className="border-danger bg-hull border-l-8 px-3 py-2">
          {state.message}
        </p>
      )}
      <div>
        <PendingButton pendingLabel={pendingLabel}>{submitLabel}</PendingButton>
      </div>
    </form>
  );
}
