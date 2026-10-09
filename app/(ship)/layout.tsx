import { NoGamePrompt } from "@/components/ship/NoGamePrompt";
import { ShipShell } from "@/components/ship/ShipShell";
import { requirePlayer } from "@/lib/auth/session";
import { getGameView } from "@/lib/server/gameService";

export default async function ShipLayout({ children }: LayoutProps<"/">) {
  const { playerId } = await requirePlayer();
  const view = await getGameView(playerId);
  if (view.status === "none") return <NoGamePrompt />;

  return <ShipShell view={view}>{children}</ShipShell>;
}
