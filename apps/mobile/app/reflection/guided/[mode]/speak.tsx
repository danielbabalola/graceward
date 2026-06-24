import { Redirect, useLocalSearchParams } from "expo-router";
import { ReflectionPlaceholder } from "@/components/reflection/ReflectionPlaceholder";
import { isGuidedMode, reflectionPlaceholders } from "@/lib/reflection-flow";

export default function GuidedSpeakScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();

  if (!mode || !isGuidedMode(mode)) {
    return <Redirect href="/reflection/guided/mode" />;
  }

  const content = reflectionPlaceholders[`${mode}-speak`];

  if (!content) {
    return <Redirect href="/reflection/guided/mode" />;
  }

  return (
    <ReflectionPlaceholder
      title={content.title}
      subtitle={content.subtitle}
      body={content.body}
      note={content.note}
    />
  );
}
