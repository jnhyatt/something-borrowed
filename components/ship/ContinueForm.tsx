import { StatefulForm } from "@/components/ui/StatefulForm";
import { continueTrip } from "@/lib/actions/game";

export function ContinueForm() {
  return (
    <StatefulForm
      action={continueTrip}
      submitLabel="Continue"
      pendingLabel="Plotting the next jump…"
    />
  );
}
