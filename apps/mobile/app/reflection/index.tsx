import { router } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { reflectionStyles } from "@/lib/reflection-flow";

export default function ReflectionStyleScreen() {
  return (
    <FlowScreen
      title="New Reflection"
      subtitle="Do you want to ramble freely, or be gently guided?"
      showBack
    >
      <Section title="Choose your approach">
        {reflectionStyles.map((style) => (
          <Card
            key={style.id}
            variant={style.variant}
            title={style.title}
            description={style.description}
            onPress={() => {
              if (style.id === "free-flow") {
                router.push("/reflection/free-flow/input-method");
                return;
              }
              router.push("/reflection/guided/mode");
            }}
          />
        ))}
      </Section>
    </FlowScreen>
  );
}
