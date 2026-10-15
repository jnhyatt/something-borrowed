import { SignOutForm } from "@/components/auth/SignOutForm";
import { NewGameForm } from "@/components/game/NewGameForm";
import { Panel } from "@/components/ui/Panel";

/** Shown on ship pages when the player has no game yet (US3 #4). */
export function NoGamePrompt() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
      <Panel className="flex flex-col gap-4 px-6 py-8">
        <h1 className="font-display text-2xl">No ship yet</h1>
        <p className="text-lg">
          You&apos;re standing in an empty hangar. Your uncle&apos;s junker is
          parked next door, and he&apos;s holding out the keys.
        </p>
        <NewGameForm />
        <div>
          <SignOutForm />
        </div>
      </Panel>
    </main>
  );
}
