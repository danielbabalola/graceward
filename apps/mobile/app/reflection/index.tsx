import { router, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { reflectionStyles } from "@/lib/reflection-flow";
import { entryDateForwardParams } from "@/lib/reflection-date";

export default function ReflectionStyleScreen() {
  const { entryDate } = useLocalSearchParams<{ entryDate?: string }>();
  const forward = entryDateForwardParams(entryDate);

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
                router.push({
                  pathname: "/reflection/free-flow/input-method",
                  params: forward,
                });
                return;
              }
              router.push({
                pathname: "/reflection/guided/mode",
                params: forward,
              });
            }}
          />
        ))}
      </Section>
    </FlowScreen>
  );
}
