import { notFound } from "next/navigation";
import { AreaHeader } from "@/components/ship/AreaHeader";
import { requirePlayer } from "@/lib/auth/session";
import { getArea, isAreaSlug } from "@/lib/game/areas";

export default async function AreaPage({ params }: PageProps<"/[area]">) {
  await requirePlayer();
  const { area } = await params;
  if (!isAreaSlug(area)) notFound();

  return <AreaHeader area={getArea(area)} />;
}
