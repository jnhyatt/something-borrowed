import { notFound } from "next/navigation";
import { ActionList } from "@/components/ship/ActionList";
import { AreaHeader } from "@/components/ship/AreaHeader";
import { requirePlayer } from "@/lib/auth/session";
import { getArea, isAreaSlug } from "@/lib/game/areas";
import { getGameView } from "@/lib/server/gameService";

export default async function AreaPage({ params }: PageProps<"/[area]">) {
  const { playerId } = await requirePlayer();
  const { area } = await params;
  if (!isAreaSlug(area)) notFound();

  const view = await getGameView(playerId);
  // The layout shows NoGamePrompt instead of this page.
  if (view.status === "none") return null;

  return (
    <>
      <AreaHeader area={getArea(area)} />
      {view.isEvaluating && (
        <p className="border-warning bg-hull rounded-plate border-l-8 px-3 py-2">
          Your last action is still being worked out — reload in a moment.
        </p>
      )}
      <ActionList
        actions={view.actions.filter((action) => action.area === area)}
        canAct={view.status === "in-progress" && !view.isEvaluating}
      />
    </>
  );
}
