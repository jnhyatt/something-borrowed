import type { ActionView } from "@/lib/game/types";
import { ActionItem } from "./ActionItem";

type ActionListProps = { actions: ActionView[]; canAct: boolean };

export function ActionList({ actions, canAct }: ActionListProps) {
  return (
    <ul aria-label="Actions" className="flex flex-col gap-3">
      {actions.map((action) => (
        <ActionItem key={action.id} action={action} canAct={canAct} />
      ))}
    </ul>
  );
}
