import { SignOutForm } from "@/components/auth/SignOutForm";
import { LossScreen } from "@/components/game/LossScreen";
import { NewGameForm } from "@/components/game/NewGameForm";
import { Premise } from "@/components/game/Premise";
import { ResumePanel } from "@/components/game/ResumePanel";
import { VictoryScreen } from "@/components/game/VictoryScreen";
import { Button } from "@/components/ui/Button";
import { getOptionalPlayer } from "@/lib/auth/session";
import type { GameView } from "@/lib/game/types";
import { getGameView } from "@/lib/server/gameService";

/** The home screen for each game state (contracts/routes.md, "/"). */
function HomeContent({ view }: { view: GameView }) {
  switch (view.status) {
    case "none":
      return (
        <Premise>
          <NewGameForm />
        </Premise>
      );
    case "in-progress":
    case "between-legs":
      return <ResumePanel leg={view.leg} />;
    case "won":
      return <VictoryScreen finalText={view.attempts.at(-1)?.text} />;
    case "lost":
      return <LossScreen finalText={view.attempts.at(-1)?.text} />;
  }
}

export default async function Home() {
  const player = await getOptionalPlayer();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-10">
      {player ? (
        <>
          <HomeContent view={await getGameView(player.playerId)} />
          <div>
            <SignOutForm />
          </div>
        </>
      ) : (
        <Premise>
          <div className="flex flex-wrap gap-3">
            <Button href="/auth/signup">Sign up</Button>
            <Button href="/auth/login" variant="secondary">
              Sign in
            </Button>
          </div>
        </Premise>
      )}
    </main>
  );
}
