import { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import {
  GuidedVoiceRecorder,
  type GuidedVoiceRecording,
} from "@/components/reflection/GuidedVoiceRecorder";
import { ReflectionDateSelector } from "@/components/reflection/ReflectionDateSelector";
import { createAudioAsset, createJournalEntry, toLocalDateString } from "@/lib/db";
import { persistRecording } from "@/lib/audio-storage";
import { buildGuidedVoicePayload } from "@/lib/guided-payload";
import {
  guidedModeConfigs,
  isGuidedMode,
  type GuidedMode,
} from "@/lib/reflection-flow";

const speakIntros: Record<GuidedMode, string> = {
  regular:
    "When you're ready, record one continuous reflection. Move to the next prompt whenever you like — the recording keeps going.",
  lament:
    "When you're ready, speak freely into one recording. Move through the prompts at your own pace. There is no rush.",
  rejoice:
    "When you're ready, record one continuous reflection. Let each prompt help you notice God's specific kindness.",
};

export default function GuidedSpeakScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const [entryDate, setEntryDate] = useState(() =>
    toLocalDateString(new Date()),
  );

  if (!mode || !isGuidedMode(mode)) {
    return <Redirect href="/reflection/guided/mode" />;
  }

  const config = guidedModeConfigs[mode];

  async function handleSave({
    uri,
    durationSeconds,
    markers,
  }: GuidedVoiceRecording) {
    const entry = await createJournalEntry({
      reflectionPath: "guided",
      mode: config.mode,
      inputType: "voice",
      rawText: null,
      title: config.fallbackTitle,
      entryDate,
      structuredPayloadJson: JSON.stringify(
        buildGuidedVoicePayload(config, markers),
      ),
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
    <FlowScreen title={config.title} subtitle={config.helper}>
      <GuidedVoiceRecorder
        config={config}
        idleBody={speakIntros[config.mode]}
        onSave={handleSave}
        header={
          <ReflectionDateSelector value={entryDate} onChange={setEntryDate} />
        }
      />
    </FlowScreen>
  );
}
