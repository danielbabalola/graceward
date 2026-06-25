import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { ReflectionDateSelector } from "@/components/reflection/ReflectionDateSelector";
import {
  VoiceRecorder,
  type VoiceRecording,
} from "@/components/reflection/VoiceRecorder";
import { createAudioAsset, createJournalEntry } from "@/lib/db";
import { persistRecording } from "@/lib/audio-storage";
import { resolveInitialEntryDate } from "@/lib/reflection-date";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";

export default function FreeFlowSpeakScreen() {
  const { entryDate: entryDateParam } = useLocalSearchParams<{
    entryDate?: string;
  }>();
  const [entryDate, setEntryDate] = useState(() =>
    resolveInitialEntryDate(entryDateParam),
  );
  const [dirty, setDirty] = useState(false);
  const { allowNextNavigation } = useUnsavedChangesGuard(dirty, {
    title: "Discard recording?",
    message:
      "You have a recording that hasn't been saved. If you leave now, it'll be lost.",
  });

  async function handleSave({ uri, durationSeconds }: VoiceRecording) {
    const entry = await createJournalEntry({
      reflectionPath: "free_flow",
      mode: "free_flow",
      inputType: "voice",
      rawText: null,
      title: "Voice reflection",
      entryDate,
      status: "saved",
      syncStatus: "local_only",
    });

    const persisted = persistRecording(uri, entry.id);

    await createAudioAsset({
      journalEntryId: entry.id,
      localFilePath: persisted.localFilePath,
      durationSeconds,
      fileSizeBytes: persisted.fileSizeBytes,
      mimeType: persisted.mimeType,
      transcriptionStatus: "none",
      retentionPolicy: "keep_device_only",
      syncStatus: "local_only",
    });

    allowNextNavigation();
    router.replace("/(tabs)/journal");
  }

  return (
    <FlowScreen
      title="Free Flow · Speak"
      subtitle="Speak honestly. You do not need perfect words."
    >
      <VoiceRecorder
        onSave={handleSave}
        onDirtyChange={setDirty}
        header={
          <ReflectionDateSelector value={entryDate} onChange={setEntryDate} />
        }
      />
    </FlowScreen>
  );
}
