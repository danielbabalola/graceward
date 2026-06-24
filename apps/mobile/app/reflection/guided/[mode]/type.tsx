import { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { GuidedPromptEditor } from "@/components/reflection/GuidedPromptEditor";
import { ReflectionDateSelector } from "@/components/reflection/ReflectionDateSelector";
import { createJournalEntry, toLocalDateString } from "@/lib/db";
import {
  compileGuidedReflection,
  deriveGuidedTitle,
  guidedModeConfigs,
  isGuidedMode,
  type GuidedAnswers,
} from "@/lib/reflection-flow";
import { buildGuidedTextPayload } from "@/lib/guided-payload";

export default function GuidedTypeScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const [entryDate, setEntryDate] = useState(() =>
    toLocalDateString(new Date()),
  );

  if (!mode || !isGuidedMode(mode)) {
    return <Redirect href="/reflection/guided/mode" />;
  }

  const config = guidedModeConfigs[mode];

  async function handleSave(answers: GuidedAnswers) {
    await createJournalEntry({
      reflectionPath: "guided",
      mode: config.mode,
      inputType: "text",
      rawText: compileGuidedReflection(config, answers),
      title: deriveGuidedTitle(config, answers),
      entryDate,
      structuredPayloadJson: JSON.stringify(
        buildGuidedTextPayload(config, answers),
      ),
      status: "saved",
      syncStatus: "local_only",
    });
    router.replace("/(tabs)/journal");
  }

  return (
    <FlowScreen title={config.title} subtitle={config.helper}>
      <ReflectionDateSelector value={entryDate} onChange={setEntryDate} />
      <GuidedPromptEditor
        config={config}
        saveLabel="Save reflection"
        onSave={handleSave}
      />
    </FlowScreen>
  );
}
