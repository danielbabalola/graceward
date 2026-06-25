import { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { GuidedPromptEditor } from "@/components/reflection/GuidedPromptEditor";
import { ReflectionDateSelector } from "@/components/reflection/ReflectionDateSelector";
import { createJournalEntry } from "@/lib/db";
import { handleReflectionSaveError } from "@/lib/reflection-save";
import {
  compileGuidedReflection,
  deriveGuidedTitle,
  guidedModeConfigs,
  isGuidedMode,
  type GuidedAnswers,
} from "@/lib/reflection-flow";
import { resolveInitialEntryDate } from "@/lib/reflection-date";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { buildGuidedTextPayload } from "@/lib/guided-payload";

export default function GuidedTypeScreen() {
  const { mode, entryDate: entryDateParam } = useLocalSearchParams<{
    mode: string;
    entryDate?: string;
  }>();
  const [entryDate, setEntryDate] = useState(() =>
    resolveInitialEntryDate(entryDateParam),
  );
  const [dirty, setDirty] = useState(false);
  const { allowNextNavigation } = useUnsavedChangesGuard(dirty);

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
    allowNextNavigation();
    router.replace("/(tabs)/journal");
  }

  return (
    <FlowScreen title={config.title} subtitle={config.helper}>
      <ReflectionDateSelector value={entryDate} onChange={setEntryDate} />
      <GuidedPromptEditor
        config={config}
        saveLabel="Save reflection"
        onSave={handleSave}
        onDirtyChange={setDirty}
        onError={handleReflectionSaveError}
      />
    </FlowScreen>
  );
}
