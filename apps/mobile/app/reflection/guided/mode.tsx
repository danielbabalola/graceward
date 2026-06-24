import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { guidedModes } from "@/lib/reflection-flow";
import { entryDateForwardParams } from "@/lib/reflection-date";

export default function GuidedModeScreen() {
  const { entryDate } = useLocalSearchParams<{ entryDate?: string }>();
  const forward = entryDateForwardParams(entryDate);

  return (
    <FlowScreen
      title="Guided Reflection"
      subtitle="What kind of reflection do you need today?"
    >
      <Section title="Guided mode">
        {guidedModes.map((mode) => (
          <Card
            key={mode.id}
            title={mode.title}
            description={mode.description}
            onPress={() =>
              router.push({
                pathname: "/reflection/guided/[mode]/input-method",
                params: { mode: mode.id, ...forward },
              })
            }
            style={
              mode.accentColor
                ? { borderColor: mode.accentColor }
                : undefined
            }
          />
        ))}
      </Section>
    </FlowScreen>
  );
}
