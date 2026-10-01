import { ShipShell } from "@/components/ship/ShipShell";
import { requirePlayer } from "@/lib/auth/session";

export default async function ShipLayout({ children }: LayoutProps<"/">) {
  await requirePlayer();
  return <ShipShell>{children}</ShipShell>;
}
