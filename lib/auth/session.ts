import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export type Player = { playerId: string };

export const getOptionalPlayer = cache(async (): Promise<Player | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? { playerId: session.user.id } : null;
});

export async function requirePlayer(): Promise<Player> {
  const player = await getOptionalPlayer();
  if (!player) redirect("/auth/login");
  return player;
}
