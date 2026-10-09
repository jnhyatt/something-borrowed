import { Panel } from "@/components/ui/Panel";
import { StatefulForm } from "@/components/ui/StatefulForm";
import { takeShipAction } from "@/lib/actions/game";
import { REQUEST_METHOD } from "@/lib/game/requestTypes";
import type { ActionView } from "@/lib/game/types";
import { OutcomeTag } from "./OutcomeTag";

type ActionItemProps = {
  action: ActionView;
  // False between legs, after the game ends, and while another action is evaluated.
  canAct: boolean;
};

export function ActionItem({ action, canAct }: ActionItemProps) {
  const isTried = action.isTriedThisScenario;

  return (
    <li>
      <Panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col gap-1">
          {canAct && !isTried ? (
            <StatefulForm
              action={takeShipAction.bind(null, action.id)}
              submitLabel={action.label}
              pendingLabel="Consulting the manual…"
            />
          ) : (
            <p className="text-base">{action.label}</p>
          )}
        </div>
        {isTried && <OutcomeTag outcome="tried" />}
      </Panel>
    </li>
  );
}
