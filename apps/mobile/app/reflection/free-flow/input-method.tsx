import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { inputMethods } from "@/lib/reflection-flow";

export default function FreeFlowInputMethodScreen() {
  return (
    <FlowScreen
      title="Free Flow"
      subtitle="How would you like to reflect?"
    >
      <Section title="Input method">
        {inputMethods.map((method) => (
          <Card
            key={method.id}
            variant={method.variant}
            title={method.title}
            description={method.description}
            onPress={() => router.push(`/reflection/free-flow/${method.id}`)}
          />
        ))}
      </Section>
    </FlowScreen>
  );
}
