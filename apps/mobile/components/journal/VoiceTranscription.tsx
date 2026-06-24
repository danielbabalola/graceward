import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { AudioAsset, JournalEntry } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { JournalAiSection } from "@/components/journal/JournalAiSection";
import { canAnalyzeEntry } from "@/lib/api/reflection";
import {
  transcribeReflection,
  TranscriptionApiError,
} from "@/lib/api/transcription";
import {
  acknowledgeVoiceTranscriptionConsent,
  hasAcknowledgedVoiceTranscriptionConsent,
  saveVoiceTranscript,
  updateAudioTranscriptionStatus,
} from "@/lib/db";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type Props = {
  entry: JournalEntry;
  audioAsset: AudioAsset | null;
  /** Whether the local audio file still exists on this device. */
  audioAvailable: boolean;
  /** Called with the refreshed entry once a transcript is saved or edited. */
  onTranscribed: (entry: JournalEntry) => void;
};

type UiState = "idle" | "transcribing" | "error";

const PRIVACY_BODY =
  "This sends this voice recording to Graceward's transcription service so it can be converted to text. Nothing is sent unless you choose this.";

const DEFAULT_AUDIO_MIME = "audio/m4a";

/**
 * Manual voice transcription for a saved voice reflection. Nothing is uploaded
 * unless the user taps "Transcribe this reflection" and confirms the privacy
 * notice. Once a transcript exists it is shown (and is editable) here, and the
 * entry becomes eligible for "Reflect with Graceward" — which sends only the
 * transcript text, never the audio. Transcribing never deletes the recording.
 */
export function VoiceTranscription({
  entry,
  audioAsset,
  audioAvailable,
  onTranscribed,
}: Props) {
  const transcript = entry.rawText?.trim() ?? "";
  const hasTranscript = transcript.length > 0;

  const [uiState, setUiState] = useState<UiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Seeded from the asset so a previously-failed attempt shows a calm retry.
  const [failed, setFailed] = useState(
    audioAsset?.transcriptionStatus === "failed",
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Guards against duplicate uploads from double taps: only one transcription
  // (including its consent flow) can be in flight at a time.
  const inFlightRef = useRef(false);

  async function runTranscription() {
    if (!audioAsset || uiState === "transcribing") {
      return;
    }
    setUiState("transcribing");
    setErrorMessage(null);
    setFailed(false);
    try {
      await updateAudioTranscriptionStatus(audioAsset.id, "processing");
      const { transcript: text } = await transcribeReflection({
        uri: audioAsset.localFilePath,
        mimeType: audioAsset.mimeType ?? DEFAULT_AUDIO_MIME,
        journalEntryId: entry.id,
        audioAssetId: audioAsset.id,
      });
      const updated = await saveVoiceTranscript(entry.id, text);
      await updateAudioTranscriptionStatus(audioAsset.id, "completed");
      setUiState("idle");
      if (updated) {
        onTranscribed(updated);
      }
    } catch (error: unknown) {
      // Mark failed so the calm retry state persists if the user leaves, and so
      // the UI never stays stuck in "processing" after an error.
      try {
        await updateAudioTranscriptionStatus(audioAsset.id, "failed");
      } catch {
        // Status is best-effort; the in-memory failed state still drives UI.
      }
      const message =
        error instanceof TranscriptionApiError
          ? error.message
          : "Something went wrong. Please try again.";
      setErrorMessage(message);
      setFailed(true);
      setUiState("error");
    }
  }

  function startTranscription() {
    if (!audioAsset || !audioAvailable || inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    const release = () => {
      inFlightRef.current = false;
    };

    void (async () => {
      let acknowledged: boolean;
      try {
        acknowledged = await hasAcknowledgedVoiceTranscriptionConsent();
      } catch {
        acknowledged = false;
      }

      if (acknowledged) {
        try {
          await runTranscription();
        } finally {
          release();
        }
        return;
      }

      Alert.alert(
        "Transcribe this reflection?",
        PRIVACY_BODY,
        [
          { text: "Cancel", style: "cancel", onPress: release },
          {
            text: "Continue",
            onPress: () => {
              void (async () => {
                try {
                  await acknowledgeVoiceTranscriptionConsent();
                  await runTranscription();
                } finally {
                  release();
                }
              })();
            },
          },
        ],
        // Release the guard if the alert is dismissed without a choice (Android).
        { cancelable: true, onDismiss: release },
      );
    })();
  }

  function startEditing() {
    setDraft(transcript);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraft("");
  }

  async function handleSaveEdit() {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || saving) {
      return;
    }
    setSaving(true);
    try {
      // Saving bumps the entry's updatedAt and keeps input_type = voice plus the
      // audio asset, while making any prior AI result stale via the timestamp.
      const updated = await saveVoiceTranscript(entry.id, trimmed);
      setEditing(false);
      setDraft("");
      if (updated) {
        onTranscribed(updated);
      }
    } catch {
      Alert.alert(
        "Could not save",
        "Your changes to the transcript could not be saved just now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Transcript exists and is being edited.
  if (hasTranscript && editing) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Text style={styles.sectionLabel}>Edit transcript</Text>
        <View style={styles.editorWrapper}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Edit the transcript text"
            placeholderTextColor={colors.textSubtle}
            multiline
            autoFocus
            textAlignVertical="top"
            style={styles.input}
            accessibilityLabel="Transcript text"
          />
        </View>
        <Button
          label="Save changes"
          onPress={handleSaveEdit}
          disabled={draft.trim().length === 0}
          loading={saving}
          style={styles.action}
        />
        <Button
          label="Cancel"
          variant="secondary"
          onPress={cancelEditing}
          disabled={saving}
          style={styles.action}
        />
      </KeyboardAvoidingView>
    );
  }

  // Transcript exists: show it, allow editing, and offer AI reflection.
  if (hasTranscript) {
    return (
      <View>
        <View style={styles.transcriptCard}>
          <Text style={styles.sectionLabel}>Transcript</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
        <Text style={styles.note}>
          This transcript was created from your voice recording after you chose
          transcription. You can edit it before reflecting with Graceward.
        </Text>
        <Text style={styles.note}>
          &quot;Reflect with Graceward&quot; uses this transcript text, not your
          raw audio. Your original recording stays on this device.
        </Text>
        <Button
          label="Edit transcript"
          variant="secondary"
          onPress={startEditing}
          style={styles.action}
        />
        {canAnalyzeEntry(entry) ? <JournalAiSection entry={entry} /> : null}
      </View>
    );
  }

  if (uiState === "transcribing") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primaryDeep} />
        <Text style={styles.note}>
          Transcribing… this recording has been sent to Graceward&apos;s
          transcription service.
        </Text>
      </View>
    );
  }

  // No transcript yet. Offer transcription (or a calm retry after a failure).
  return (
    <View>
      <Card
        variant="subtle"
        eyebrow="Transcription"
        title={failed ? "Transcription didn't finish" : "Add a text transcript"}
        description={
          failed
            ? "We couldn't transcribe this recording. Your audio is still saved on this device — you can try again."
            : "Transcription is manual. Your audio stays on this device until you choose to transcribe it, and transcribing never deletes the recording."
        }
        style={styles.card}
      />
      <Text style={styles.note}>{PRIVACY_BODY}</Text>
      {!audioAvailable ? (
        <Text style={styles.note}>
          This audio is no longer available on this device, so it can&apos;t be
          transcribed.
        </Text>
      ) : null}
      <Button
        label={failed ? "Try again" : "Transcribe this reflection"}
        variant="secondary"
        onPress={startTranscription}
        disabled={!audioAvailable}
        style={styles.action}
      />
      {uiState === "error" && errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  transcriptCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  transcriptText: {
    ...typography.body,
    color: colors.text,
  },
  editorWrapper: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 160,
  },
  note: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  action: {
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
    marginTop: spacing.sm,
  },
});
