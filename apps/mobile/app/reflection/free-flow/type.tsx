import { ReflectionPlaceholder } from "@/components/reflection/ReflectionPlaceholder";
import { reflectionPlaceholders } from "@/lib/reflection-flow";

const content = reflectionPlaceholders["free-flow-type"];

export default function FreeFlowTypeScreen() {
  return (
    <ReflectionPlaceholder
      title={content.title}
      subtitle={content.subtitle}
      body={content.body}
    />
  );
}
