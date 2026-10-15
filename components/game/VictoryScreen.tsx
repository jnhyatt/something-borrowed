import { Badge } from "@/components/ui/Badge";
import { EndScreen } from "./EndScreen";

type VictoryScreenProps = { finalText: string | undefined };

export function VictoryScreen({ finalText }: VictoryScreenProps) {
  return (
    <EndScreen
      title="You made it to the wedding"
      tag={<Badge variant="ok">Arrived</Badge>}
      finalText={finalText}
      intro="The junker coughs into the chapel's parking orbit with seconds to spare. You smell faintly of coolant, but nobody minds. Your uncle wants his ship back, of course."
    />
  );
}
