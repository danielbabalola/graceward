import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Button } from "@/components/ui/Button";
import { AudioPlayback } from "@/components/journal/AudioPlayback";
import { deleteLocalFile } from "@/lib/audio-storage";
import { formatDuration } from "@/lib/journal-display";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type RecorderStatus =
  | "idle"
  | "requesting"
  | "denied"
  | "recording"
  | "preview"
  | "saving"
  | "error";

export const MAX_RECORDING_SECONDS = 15 * 60;

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
};

const DEFAULT_IDLE_BODY =
  "Tap below to begin recording your reflection. Audio stays private on this device for now.";

/**
 * Self-contained voice recording panel covering the full local-recording
 * lifecycle: permission request, recording (15-minute cap), preview/playback,
 * discard, and save. DB persistence is delegated to the `onSave` prop so each
 * flow can store the correct mode/path.
 */
export function VoiceRecorder({ onSave, idleBody }: VoiceRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewSeconds, setPreviewSeconds] = useState(0);

  const elapsedSeconds = Math.floor(recorderState.durationMillis / 1000);

  const handleStop = useCallback(async () => {
    try {
      const seconds = Math.min(
        Math.round(recorderState.durationMillis / 1000),
        MAX_RECORDING_SECONDS,
      );
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setStatus("error");
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
      setPreviewUri(uri);
      setPreviewSeconds(seconds);
      setStatus("preview");
    } catch (error: unknown) {
      console.warn(
        "Failed to stop recording:",
        error instanceof Error ? error.message : "unknown error",
      );
      setStatus("error");
    }
  }, [recorder, recorderState.durationMillis]);

  // Enforce the 15-minute MVP limit.
  useEffect(() => {
    if (status === "recording" && elapsedSeconds >= MAX_RECORDING_SECONDS) {
      void handleStop();
    }
  }, [status, elapsedSeconds, handleStop]);

  async function handleStart() {
    setStatus("requesting");
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setStatus("denied");
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus("recording");
    } catch (error: unknown) {
      console.warn(
        "Failed to start recording:",
        error instanceof Error ? error.message : "unknown error",
      );
      setStatus("error");
    }
  }

  function handleDiscard() {
    if (previewUri) {
      deleteLocalFile(previewUri);
    }
    setPreviewUri(null);
    setPreviewSeconds(0);
    setStatus("idle");
  }

  async function handleSave() {
    if (!previewUri || status === "saving") {
      return;
    }
    setStatus("saving");
    try {
      await onSave({ uri: previewUri, durationSeconds: previewSeconds });
      // On success the caller navigates away; leave status as "saving".
    } catch (error: unknown) {
      console.warn(
        "Failed to save voice reflection:",
        error instanceof Error ? error.message : "unknown error",
      );
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
        <Text style={styles.hint}>
          Up to 15 minutes. Audio stays private on this device.
        </Text>
        <Button
          label="Stop"
          onPress={() => {
            void handleStop();
          }}
          style={styles.action}
        />
      </View>
    );
  }

  if (status === "preview" || status === "saving") {
    return (
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
    <View style={styles.card}>
      <Text style={styles.body}>{idleBody ?? DEFAULT_IDLE_BODY}</Text>
      <Button
        label="Start recording"
        onPress={handleStart}
        style={styles.action}
      />
    </View>
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
