import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import {
  guidedModeLabels,
  inputMethods,
  isGuidedMode,
} from "@/lib/reflection-flow";
import { entryDateForwardParams } from "@/lib/reflection-date";

export default function GuidedInputMethodScreen() {
  const { mode, entryDate } = useLocalSearchParams<{
    mode: string;
    entryDate?: string;
  }>();

  if (!mode || !isGuidedMode(mode)) {
    return <Redirect href="/reflection/guided/mode" />;
  }

  const modeLabel = guidedModeLabels[mode];
  const forward = entryDateForwardParams(entryDate);

  return (
    <FlowScreen
      title={modeLabel}
      subtitle="How would you like to reflect?"
    >
      <Section title="Input method">
        {inputMethods.map((method) => (
          <Card
            key={method.id}
            variant={method.variant}
            title={method.title}
            description={method.description}
            onPress={() =>
              router.push({
                pathname: `/reflection/guided/[mode]/${method.id}`,
                params: { mode, ...forward },
              })
            }
          />
        ))}
      </Section>
    </FlowScreen>
  );
}
