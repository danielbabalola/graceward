import { ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { AudioPlayback } from "@/components/journal/AudioPlayback";
import { formatDuration } from "@/lib/journal-display";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import type { GuidedPromptMarker } from "@/lib/guided-payload";
import type { GuidedModeConfig } from "@/lib/reflection-flow";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export type GuidedVoiceRecording = {
  uri: string;
  durationSeconds: number;
  markers: GuidedPromptMarker[];
};

type GuidedVoiceRecorderProps = {
  config: GuidedModeConfig;
  idleBody?: string;
  onSave: (recording: GuidedVoiceRecording) => Promise<void>;
  /**
   * Optional content rendered above the recorder before recording starts and
   * again in the preview state (e.g. a reflection date selector). It is hidden
   * while recording so it never interrupts the continuous audio file.
   */
  header?: ReactNode;
};

/**
 * Guided voice recorder: shows one prompt at a time while capturing a single
 * continuous recording. Advancing prompts records a time marker rather than
 * starting a new file.
 */
export function GuidedVoiceRecorder({
  config,
  idleBody,
  onSave,
  header,
}: GuidedVoiceRecorderProps) {
  const recorder = useVoiceRecorder();
  const { status, setStatus, elapsedSeconds, previewUri, previewSeconds } =
    recorder;

  const prompts = config.prompts;
  const total = prompts.length;

  const [index, setIndex] = useState(0);
  const [markers, setMarkers] = useState<GuidedPromptMarker[]>([]);
  const [savingError, setSavingError] = useState(false);

  const prompt = prompts[index];
  const isLast = index === total - 1;

  async function handleStart() {
    const started = await recorder.start();
    if (started && prompts[0]) {
      setIndex(0);
      setMarkers([
        {
          promptId: prompts[0].id,
          label: prompts[0].label,
          startedAtSeconds: 0,
        },
      ]);
    }
  }

  function handleNextPrompt() {
    if (isLast) {
      return;
    }
    const next = index + 1;
    const nextPrompt = prompts[next];
    if (!nextPrompt) {
      return;
    }
    setIndex(next);
    setMarkers((prev) => [
      ...prev,
      {
        promptId: nextPrompt.id,
        label: nextPrompt.label,
        startedAtSeconds: elapsedSeconds,
      },
    ]);
  }

  function handleDiscard() {
    recorder.discard();
    setIndex(0);
    setMarkers([]);
    setSavingError(false);
  }

  async function handleSave() {
    if (!previewUri || status === "saving") {
      return;
    }
    setStatus("saving");
    setSavingError(false);
    try {
      await onSave({
        uri: previewUri,
        durationSeconds: previewSeconds,
        markers,
      });
    } catch (error: unknown) {
      console.warn(
        "Failed to save guided voice reflection:",
        error instanceof Error ? error.message : "unknown error",
      );
      setSavingError(true);
      Alert.alert(
        "Could not save",
        "Your reflection could not be saved just now. Please try again.",
      );
      setStatus("preview");
    }
  }

  if (status === "requesting") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primaryDeep} />
        <Text style={styles.helper}>Requesting microphone access…</Text>
      </View>
    );
  }

  if (status === "denied") {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Microphone access is off</Text>
        <Text style={styles.body}>
          To record a voice reflection, enable microphone access for Graceward in
          your device Settings.
        </Text>
        <Button
          label="Open Settings"
          onPress={() => {
            void Linking.openSettings();
          }}
          style={styles.action}
        />
        <Button
          label="Back"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.action}
        />
      </View>
    );
  }

  if (status === "recording") {
    return (
      <View style={styles.card}>
        <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
        <Text style={styles.recordingLabel}>Recording…</Text>
        <Text style={styles.progress}>
          Prompt {index + 1} of {total}
        </Text>
        <Text style={styles.promptLabel}>{prompt?.label}</Text>
        <Text style={styles.hint}>
          Take your time. Move on when you're ready — the recording keeps going.
        </Text>
        {!isLast ? (
          <Button
            label="Next prompt"
            variant="secondary"
            onPress={handleNextPrompt}
            style={styles.action}
          />
        ) : null}
        <Button
          label="Stop"
          onPress={() => {
            void recorder.stop();
          }}
          style={styles.action}
        />
      </View>
    );
  }

  if (status === "preview" || status === "saving") {
    return (
      <>
        {header}
        <View style={styles.card}>
        <Text style={styles.cardTitle}>Reflection ready</Text>
        <Text style={styles.body}>
          {formatDuration(previewSeconds)} recorded. Listen back, then save or
          discard.
        </Text>
        {previewUri ? (
          <AudioPlayback
            key={previewUri}
            uri={previewUri}
            fallbackDurationSeconds={previewSeconds}
          />
        ) : null}
        <Text style={styles.hint}>
          Saved privately on this device. Transcription isn't available yet.
        </Text>
        {savingError ? (
          <Text style={styles.errorHint}>
            That didn't save. Your recording is still here — please try again.
          </Text>
        ) : null}
        <Button
          label="Save reflection"
          onPress={handleSave}
          loading={status === "saving"}
          style={styles.action}
        />
        <Button
          label="Discard"
          variant="destructive"
          onPress={handleDiscard}
          disabled={status === "saving"}
          style={styles.action}
        />
        </View>
      </>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Something went wrong</Text>
        <Text style={styles.body}>
          The recording could not be completed. Please try again.
        </Text>
        <Button
          label="Try again"
          onPress={() => setStatus("idle")}
          style={styles.action}
        />
      </View>
    );
  }

  return (
    <>
      {header}
      <View style={styles.card}>
        <Text style={styles.progress}>Prompt 1 of {total}</Text>
        <Text style={styles.promptLabel}>{prompts[0]?.label}</Text>
        <Text style={styles.body}>
          {idleBody ??
            "When you're ready, record one continuous reflection. You can move to the next prompt while recording."}
        </Text>
        <Button
          label="Start recording"
          onPress={() => {
            void handleStart();
          }}
          style={styles.action}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.cardTitle,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
  helper: {
    ...typography.body,
    color: colors.textMuted,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
  },
  errorHint: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
  },
  progress: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  promptLabel: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  timer: {
    ...typography.screenTitle,
    color: colors.primaryDeep,
    textAlign: "center",
  },
  recordingLabel: {
    ...typography.body,
    color: colors.correctionAccent,
    textAlign: "center",
  },
  action: {
    marginTop: spacing.xs,
  },
});
