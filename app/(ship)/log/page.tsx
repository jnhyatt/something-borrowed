import { ShipLog } from "@/components/log/ShipLog";
import { requirePlayer } from "@/lib/auth/session";
import { getGameView } from "@/lib/server/gameService";

export default async function LogPage() {
  const { playerId } = await requirePlayer();
  const view = await getGameView(playerId);
  // The layout shows NoGamePrompt instead of this page.
  if (view.status === "none") return null;

  return (
    <>
      <h1 className="font-display text-2xl">Ship log</h1>
      <ShipLog attempts={view.attempts} />
    </>
  );
}
