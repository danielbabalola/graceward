import { ReflectionPlaceholder } from "@/components/reflection/ReflectionPlaceholder";
import { reflectionPlaceholders } from "@/lib/reflection-flow";

const content = reflectionPlaceholders["free-flow-speak"];

export default function FreeFlowSpeakScreen() {
  return (
    <ReflectionPlaceholder
      title={content.title}
      subtitle={content.subtitle}
      body={content.body}
    />
  );
}
