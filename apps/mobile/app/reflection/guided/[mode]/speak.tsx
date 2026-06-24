import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import {
  VoiceRecorder,
  type VoiceRecording,
} from "@/components/reflection/VoiceRecorder";
import { createAudioAsset, createJournalEntry } from "@/lib/db";
import { persistRecording } from "@/lib/audio-storage";
import {
  guidedModeConfigs,
  isGuidedMode,
  type GuidedMode,
} from "@/lib/reflection-flow";
import { colors, radii, spacing, typography } from "@/theme/tokens";

const speakIntros: Record<GuidedMode, string> = {
  regular:
    "When you're ready, record one continuous reflection. Let the prompts above guide you — there's no need to answer them in order.",
  lament:
    "When you're ready, speak freely into one recording. Move through the prompts at your own pace. There is no rush.",
  rejoice:
    "When you're ready, record one continuous reflection. Let the prompts above help you notice God's specific kindness.",
};

export default function GuidedSpeakScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();

  if (!mode || !isGuidedMode(mode)) {
    return <Redirect href="/reflection/guided/mode" />;
  }

  const config = guidedModeConfigs[mode];

  async function handleSave({ uri, durationSeconds }: VoiceRecording) {
    const entry = await createJournalEntry({
      reflectionPath: "guided",
      mode: config.mode,
      inputType: "voice",
      rawText: null,
      title: config.fallbackTitle,
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
      {config.note ? (
        <View
          style={[
            styles.note,
            config.accentColor ? { borderLeftColor: config.accentColor } : null,
          ]}
        >
          <Text style={styles.noteText}>{config.note}</Text>
        </View>
      ) : null}

      <View style={styles.promptsCard}>
        <Text style={styles.promptsHeading}>Let these guide your reflection</Text>
        {config.prompts.map((prompt) => (
          <View key={prompt.id} style={styles.promptRow}>
            <Text style={styles.promptBullet}>·</Text>
            <Text style={styles.promptLabel}>{prompt.label}</Text>
          </View>
        ))}
      </View>

      <VoiceRecorder onSave={handleSave} idleBody={speakIntros[config.mode]} />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.lamentAccent,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  promptsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  promptsHeading: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  promptRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  promptBullet: {
    ...typography.body,
    color: colors.textSubtle,
  },
  promptLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
});
