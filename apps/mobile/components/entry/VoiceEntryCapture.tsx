import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type {
  StructureVoiceEntryResponse,
  VoiceEntryType,
} from "@graceward/ai-schemas";
import { Button } from "@/components/ui/Button";
import { AudioPlayback } from "@/components/journal/AudioPlayback";
import { RecordingIndicator } from "@/components/reflection/RecordingIndicator";
import {
  structureVoiceEntry,
  VoiceEntryApiError,
} from "@/lib/api/voice-entry";
import {
  acknowledgeVoiceEntryConsent,
  hasAcknowledgedVoiceEntryConsent,
} from "@/lib/db";
import { formatDuration } from "@/lib/journal-display";
import { haptics } from "@/lib/haptics";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type Props = {
  /** Which kind of entry the spoken note should become. */
  entryType: VoiceEntryType;
  /** Today's local date (YYYY-MM-DD) so spoken follow-up times resolve. */
  entryDate: string;
  /**
   * Called with the structured result once processing succeeds. The parent
   * uses it to fill the form fields, which the user then reviews and saves.
   */
  onStructured: (result: StructureVoiceEntryResponse) => void;
  /** Whether the user has already typed/edited the form (affects the prompt). */
  hasExistingInput?: boolean;
};

type Phase = "capture" | "processing" | "error" | "done";

const DEFAULT_AUDIO_MIME = "audio/m4a";

const NOUNS: Record<VoiceEntryType, string> = {
  prayer: "prayer request",
  gratitude: "gratitude",
  faithfulness: "testimony",
  lesson: "lesson",
  dream: "dream",
  prophecy: "prophecy",
  instruction: "instruction",
};

function privacyBody(entryType: VoiceEntryType): string {
  return `This sends your recording to Graceward to turn it into text and organize it into a ${NOUNS[entryType]}. Nothing is sent unless you choose this, and your recording isn't kept after it's processed.`;
}

/**
 * Lets the user speak an entry instead of typing it. The recording is sent to
 * Graceward, transcribed, and organized into the entry type's fields, which the
 * parent screen fills in for the user to review and save. Nothing is uploaded
 * until the user taps "Use this recording" and confirms the privacy notice; the
 * recording stays on this device until then and is discarded after processing.
 */
export function VoiceEntryCapture({
  entryType,
  entryDate,
  onStructured,
  hasExistingInput = false,
}: Props) {
  const recorder = useVoiceRecorder();
  const { status, setStatus, elapsedSeconds, previewUri, previewSeconds } =
    recorder;

  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState<Phase>("capture");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Guards the whole "use this recording" interaction (replace prompt, consent
  // prompt, and upload) so rapid double taps can never open duplicate prompts
  // or fire duplicate uploads. Held until the interaction fully settles.
  const inFlightRef = useRef(false);

  async function runStructuring(uri: string) {
    setPhase("processing");
    setErrorMessage(null);
    try {
      const result = await structureVoiceEntry({
        uri,
        mimeType: DEFAULT_AUDIO_MIME,
        entryType,
        entryDate,
      });
      // Only a successful structuring touches the form fields — a failure
      // never overwrites or clears what the user has typed.
      onStructured(result);
      // The recording has served its purpose; discard it from this device.
      recorder.discard();
      setPhase("done");
      setExpanded(false);
    } catch (error: unknown) {
      const message =
        error instanceof VoiceEntryApiError
          ? error.message
          : "Something went wrong. Please try again.";
      setErrorMessage(message);
      setPhase("error");
    }
  }

  /**
   * Runs the consent gate, then (only on confirm) uploads and structures.
   * `release` frees the in-flight guard once the interaction settles, including
   * when the user cancels or dismisses the notice (so nothing is uploaded).
   */
  function confirmConsentThenStructure(uri: string, release: () => void) {
    void (async () => {
      let acknowledged = false;
      try {
        acknowledged = await hasAcknowledgedVoiceEntryConsent();
      } catch {
        acknowledged = false;
      }

      if (acknowledged) {
        try {
          await runStructuring(uri);
        } finally {
          release();
        }
        return;
      }

      Alert.alert(
        "Use your voice to create this?",
        privacyBody(entryType),
        [
          { text: "Cancel", style: "cancel", onPress: release },
          {
            text: "Continue",
            onPress: () => {
              void (async () => {
                try {
                  await acknowledgeVoiceEntryConsent();
                  await runStructuring(uri);
                } finally {
                  release();
                }
              })();
            },
          },
        ],
        { cancelable: true, onDismiss: release },
      );
    })();
  }

  function startUpload(uri: string) {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    confirmConsentThenStructure(uri, () => {
      inFlightRef.current = false;
    });
  }

  function handleUseRecording() {
    if (!previewUri || inFlightRef.current) {
      return;
    }
    // When the user has already typed something, confirm before replacing it.
    // Hold the guard across the confirm + consent prompts so a second tap can't
    // stack another prompt or kick off a parallel upload.
    if (hasExistingInput) {
      inFlightRef.current = true;
      const release = () => {
        inFlightRef.current = false;
      };
      const uri = previewUri;
      Alert.alert(
        "Replace what you've entered?",
        "Using this recording will fill in the fields from what you said, replacing anything you've already typed.",
        [
          { text: "Cancel", style: "cancel", onPress: release },
          {
            text: "Continue",
            onPress: () => confirmConsentThenStructure(uri, release),
          },
        ],
        { cancelable: true, onDismiss: release },
      );
      return;
    }
    startUpload(previewUri);
  }

  function collapse() {
    if (previewUri) {
      recorder.discard();
    } else {
      setStatus("idle");
    }
    setPhase("capture");
    setErrorMessage(null);
    setExpanded(false);
  }

  // Collapsed entry point, plus a calm confirmation after a successful fill.
  if (!expanded) {
    return (
      <View style={styles.wrapper}>
        {phase === "done" ? (
          <Text style={styles.doneNote}>
            Filled in from your voice — review and edit below, then save.
          </Text>
        ) : null}
        <Button
          label={phase === "done" ? "Record again" : "Speak instead of typing"}
          variant="secondary"
          onPress={() => {
            setPhase("capture");
            setExpanded(true);
          }}
        />
      </View>
    );
  }

  if (status === "requesting") {
    return (
      <View style={[styles.wrapper, styles.centered]}>
        <ActivityIndicator color={colors.primaryDeep} />
        <Text style={styles.body}>Requesting microphone access…</Text>
      </View>
    );
  }

  if (status === "denied") {
    return (
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Microphone access is off</Text>
          <Text style={styles.body}>
            To speak this entry, enable microphone access for Graceward in your
            device Settings.
          </Text>
          <Button
            label="Open Settings"
            onPress={() => {
              void Linking.openSettings();
            }}
            style={styles.action}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={collapse}
            style={styles.action}
          />
        </View>
      </View>
    );
  }

  if (phase === "processing") {
    return (
      <View style={[styles.wrapper, styles.centered]}>
        <ActivityIndicator color={colors.primaryDeep} />
        <Text style={styles.body}>
          Listening and organizing what you said…
        </Text>
        <Text style={styles.hint}>
          Your recording was sent to Graceward to turn it into a{" "}
          {NOUNS[entryType]}.
        </Text>
      </View>
    );
  }

  if (phase === "error") {
    return (
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>That didn&apos;t finish</Text>
          <Text style={styles.body}>
            {errorMessage ?? "Something went wrong. Please try again."}
          </Text>
          <Text style={styles.hint}>
            Nothing you typed was changed, and your recording is still here.
          </Text>
          {previewUri ? (
            <Button
              label="Try again"
              onPress={() => startUpload(previewUri)}
              style={styles.action}
            />
          ) : null}
          <Button
            label="Cancel"
            variant="secondary"
            onPress={collapse}
            style={styles.action}
          />
        </View>
      </View>
    );
  }

  if (status === "recording") {
    return (
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
          <RecordingIndicator />
          <Text style={styles.hint}>
            Speak naturally — say what you&apos;d like, and Graceward will
            organize it. Up to 15 minutes.
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
      </View>
    );
  }

  if (status === "preview") {
    return (
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recording ready</Text>
          <Text style={styles.body}>
            {formatDuration(previewSeconds)} recorded. Listen back, then use it
            to fill in your {NOUNS[entryType]}.
          </Text>
          {previewUri ? (
            <AudioPlayback
              key={previewUri}
              uri={previewUri}
              fallbackDurationSeconds={previewSeconds}
            />
          ) : null}
          <Button
            label="Use this recording"
            onPress={handleUseRecording}
            style={styles.action}
          />
          <Button
            label="Re-record"
            variant="secondary"
            onPress={recorder.discard}
            style={styles.action}
          />
          <Button
            label="Cancel"
            variant="destructive"
            onPress={collapse}
            style={styles.action}
          />
        </View>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.wrapper}>
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
          <Button
            label="Cancel"
            variant="secondary"
            onPress={collapse}
            style={styles.action}
          />
        </View>
      </View>
    );
  }

  // Idle (expanded): ready to record.
  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Text style={styles.body}>
          Speak your {NOUNS[entryType]} in your own words. Graceward will turn
          it into text and organize it for you to review.
        </Text>
        <Text style={styles.hint}>{privacyBody(entryType)}</Text>
        <Button
          label="Start recording"
          onPress={() => {
            haptics.medium();
            void recorder.start();
          }}
          style={styles.action}
        />
        <Button
          label="Cancel"
          variant="secondary"
          onPress={collapse}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
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
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
  },
  doneNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.sm,
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
