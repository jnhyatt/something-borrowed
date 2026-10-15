import { OutcomeTag } from "@/components/ship/OutcomeTag";
import { EndScreen } from "./EndScreen";

type LossScreenProps = { finalText: string | undefined };

export function LossScreen({ finalText }: LossScreenProps) {
  return (
    <EndScreen
      title="Towed to the scrapyard"
      tag={<OutcomeTag outcome="game-over" />}
      finalText={finalText}
      intro="The wedding goes on without you. Your uncle would like a word, and possibly a new ship."
    />
  );
}
