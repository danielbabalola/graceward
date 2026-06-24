import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { guidedModes } from "@/lib/reflection-flow";

export default function GuidedModeScreen() {
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
              router.push(`/reflection/guided/${mode.id}/input-method`)
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
