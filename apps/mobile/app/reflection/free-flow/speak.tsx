import { useState } from "react";
import { router } from "expo-router";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { ReflectionDateSelector } from "@/components/reflection/ReflectionDateSelector";
import {
  VoiceRecorder,
  type VoiceRecording,
} from "@/components/reflection/VoiceRecorder";
import { createAudioAsset, createJournalEntry, toLocalDateString } from "@/lib/db";
import { persistRecording } from "@/lib/audio-storage";

export default function FreeFlowSpeakScreen() {
  const [entryDate, setEntryDate] = useState(() =>
    toLocalDateString(new Date()),
  );

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

    router.replace("/(tabs)/journal");
  }

  return (
    <FlowScreen
      title="Free Flow · Speak"
      subtitle="Speak honestly. You do not need perfect words."
    >
      <VoiceRecorder
        onSave={handleSave}
        header={
          <ReflectionDateSelector value={entryDate} onChange={setEntryDate} />
        }
      />
    </FlowScreen>
  );
}
