import { ReactNode, useEffect, useState } from "react";
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
import { RecordingIndicator } from "@/components/reflection/RecordingIndicator";
import { formatDuration } from "@/lib/journal-display";
import { haptics } from "@/lib/haptics";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export type VoiceRecording = {
  uri: string;
  durationSeconds: number;
};

type VoiceRecorderProps = {
  /**
   * Persists the recording (create the journal entry + audio asset) and, on
   * success, navigates away. Should throw on failure so the recorder can return
   * the user to the preview state.
   */
  onSave: (recording: VoiceRecording) => Promise<void>;
  /** Copy shown in the idle state before recording begins. */
  idleBody?: string;
  /**
   * Reports whether there is in-progress or recorded-but-unsaved audio, so a
   * parent screen can warn before discarding it. Pass a stable setter.
   */
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Optional content rendered above the recorder before recording starts and
   * again in the preview state (e.g. a reflection date selector). It is hidden
   * while recording so it never interrupts the audio session.
   */
  header?: ReactNode;
};

const DEFAULT_IDLE_BODY =
  "Tap below to begin recording your reflection. Audio stays private on this device for now.";

/**
 * Self-contained voice recording panel for a single continuous reflection.
 * Recording lifecycle lives in `useVoiceRecorder`; DB persistence is delegated
 * to the `onSave` prop so each flow can store the correct mode/path.
 */
export function VoiceRecorder({
  onSave,
  idleBody,
  onDirtyChange,
  header,
}: VoiceRecorderProps) {
  const recorder = useVoiceRecorder();
  const { status, setStatus, elapsedSeconds, previewUri, previewSeconds } =
    recorder;

  const [savingError, setSavingError] = useState(false);

  useEffect(() => {
    onDirtyChange?.(status === "recording" || status === "preview");
  }, [status, onDirtyChange]);

  async function handleSave() {
    if (!previewUri || status === "saving") {
      return;
    }
    setStatus("saving");
    setSavingError(false);
    try {
      await onSave({ uri: previewUri, durationSeconds: previewSeconds });
      haptics.success();
      // On success the caller navigates away; leave status as "saving".
    } catch (error: unknown) {
      console.warn(
        "Failed to save voice reflection:",
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
        <RecordingIndicator />
        <Text style={styles.hint}>
          Up to 15 minutes. Audio stays private on this device.
        </Text>
        <Button
          label="Stop"
          onPress={() => {
            haptics.medium();
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
          onPress={recorder.discard}
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
        <Text style={styles.body}>{idleBody ?? DEFAULT_IDLE_BODY}</Text>
        <Button
          label="Start recording"
          onPress={() => {
            haptics.medium();
            void recorder.start();
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
  timer: {
    ...typography.screenTitle,
    color: colors.primaryDeep,
    textAlign: "center",
  },
  action: {
    marginTop: spacing.xs,
  },
});
