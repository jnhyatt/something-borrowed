import { SignOutForm } from "@/components/auth/SignOutForm";
import { Premise } from "@/components/game/Premise";
import { Button } from "@/components/ui/Button";
import { getOptionalPlayer } from "@/lib/auth/session";

export default async function Home() {
  const player = await getOptionalPlayer();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
      <Premise>
        {player ? (
          <div className="flex flex-wrap gap-3">
            <Button href="/piloting">Liftoff</Button>
            <SignOutForm />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button href="/auth/signup">Sign up</Button>
            <Button href="/auth/login" variant="secondary">
              Sign in
            </Button>
          </div>
        )}
      </Premise>
    </main>
  );
}
