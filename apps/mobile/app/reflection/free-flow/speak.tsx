import { router } from "expo-router";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import {
  VoiceRecorder,
  type VoiceRecording,
} from "@/components/reflection/VoiceRecorder";
import { createAudioAsset, createJournalEntry } from "@/lib/db";
import { persistRecording } from "@/lib/audio-storage";

export default function FreeFlowSpeakScreen() {
  async function handleSave({ uri, durationSeconds }: VoiceRecording) {
    const entry = await createJournalEntry({
      reflectionPath: "free_flow",
      mode: "free_flow",
      inputType: "voice",
      rawText: null,
      title: "Voice reflection",
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
      <VoiceRecorder onSave={handleSave} />
    </FlowScreen>
  );
}
