import Link from "next/link";
import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";
import { NewGameForm } from "./NewGameForm";

type EndScreenProps = {
  title: string;
  tag: ReactNode;
  // The story beat for this ending, before the final result text.
  intro: string;
  finalText: string | undefined;
};

/** Shared frame for the victory and loss screens: the ending, the log, and a new game. */
export function EndScreen({ title, tag, intro, finalText }: EndScreenProps) {
  return (
    <Panel className="flex flex-col gap-5 px-6 py-8 sm:px-10">
      <div className="flex flex-col items-start gap-3">
        {tag}
        <h1 className="font-display text-4xl leading-tight">{title}</h1>
      </div>
      <div className="flex flex-col gap-3 text-lg">
        {finalText && <p>{finalText}</p>}
        <p className="text-ink-muted">{intro}</p>
      </div>
      <p>
        <Link href="/log" className="text-rust underline">
          Read the ship log
        </Link>
      </p>
      <NewGameForm />
    </Panel>
  );
}
