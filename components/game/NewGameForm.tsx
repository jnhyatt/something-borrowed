import { StatefulForm } from "@/components/ui/StatefulForm";
import { startNewGame } from "@/lib/actions/game";

type NewGameFormProps = { submitLabel?: string };

/** Generates a new game, replacing any current one, then opens the ship. */
export function NewGameForm({
  submitLabel = "Borrow the junker",
}: NewGameFormProps) {
  return (
    <StatefulForm
      action={startNewGame}
      submitLabel={submitLabel}
      pendingLabel="Haggling with your uncle…"
    />
  );
}
