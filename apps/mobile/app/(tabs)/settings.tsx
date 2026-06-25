import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Section } from "@/components/ui/Section";
import { SettingsRow } from "@/components/ui/SettingsRow";
import {
  deleteAllLocalData,
  hasAcknowledgedAiReflectionConsent,
  hasAcknowledgedVoiceEntryConsent,
  hasAcknowledgedVoiceTranscriptionConsent,
  resetAiReflectionConsent,
  resetVoiceEntryConsent,
  resetVoiceTranscriptionConsent,
} from "@/lib/db";
import { getDiagnosticInfo } from "@/lib/app-info";
import {
  APP_NAME,
  APP_TAGLINE,
  SUPPORT_EMAIL,
  buildBugReportBody,
  buildFeedbackBody,
  buildMailtoUrl,
  formatDiagnostics,
} from "@/lib/diagnostics";
import { exportLocalData } from "@/lib/local-data-export";
import { colors, spacing, typography } from "@/theme/tokens";

type ExportState = "idle" | "exporting" | "done" | "error";
type DeleteState = "idle" | "deleting" | "done" | "error";
type ConsentState = "loading" | "acknowledged" | "not-acknowledged";
type HelpMessage = { kind: "success" | "info" | "error"; text: string } | null;

export default function SettingsScreen() {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [consentState, setConsentState] = useState<ConsentState>("loading");
  const [transcriptionConsentState, setTranscriptionConsentState] =
    useState<ConsentState>("loading");
  const [voiceEntryConsentState, setVoiceEntryConsentState] =
    useState<ConsentState>("loading");
  const [helpMessage, setHelpMessage] = useState<HelpMessage>(null);

  // Read once for the About display. Handlers re-read fresh so the diagnostics
  // timestamp reflects the moment the user copies/sends.
  const appVersionLabel = useMemo(() => {
    const info = getDiagnosticInfo();
    if (!info.appVersion) {
      return "Version unavailable in this build";
    }
    return info.buildNumber
      ? `Version ${info.appVersion} (${info.buildNumber})`
      : `Version ${info.appVersion}`;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [aiAcknowledged, transcriptionAcknowledged, voiceEntryAcknowledged] =
            await Promise.all([
              hasAcknowledgedAiReflectionConsent(),
              hasAcknowledgedVoiceTranscriptionConsent(),
              hasAcknowledgedVoiceEntryConsent(),
            ]);
          if (active) {
            setConsentState(
              aiAcknowledged ? "acknowledged" : "not-acknowledged",
            );
            setTranscriptionConsentState(
              transcriptionAcknowledged ? "acknowledged" : "not-acknowledged",
            );
            setVoiceEntryConsentState(
              voiceEntryAcknowledged ? "acknowledged" : "not-acknowledged",
            );
          }
        } catch {
          // Treat a read failure as not acknowledged so the notices still show.
          if (active) {
            setConsentState("not-acknowledged");
            setTranscriptionConsentState("not-acknowledged");
            setVoiceEntryConsentState("not-acknowledged");
          }
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  // Resetting a consent notice isn't destructive, but it changes future
  // behavior (the privacy notice will reappear), so confirm before doing it.
  function handleResetConsent() {
    Alert.alert(
      "Show the AI reflection notice again?",
      "The privacy notice will appear the next time you reflect with Graceward.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Show again", onPress: () => void performResetConsent() },
      ],
    );
  }

  async function performResetConsent() {
    try {
      await resetAiReflectionConsent();
      setConsentState("not-acknowledged");
    } catch (error: unknown) {
      console.warn(
        "Failed to reset AI consent notice:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  function handleResetTranscriptionConsent() {
    Alert.alert(
      "Show the transcription notice again?",
      "The privacy notice will appear the next time you transcribe a voice reflection.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Show again",
          onPress: () => void performResetTranscriptionConsent(),
        },
      ],
    );
  }

  async function performResetTranscriptionConsent() {
    try {
      await resetVoiceTranscriptionConsent();
      setTranscriptionConsentState("not-acknowledged");
    } catch (error: unknown) {
      console.warn(
        "Failed to reset voice transcription consent notice:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  function handleResetVoiceEntryConsent() {
    Alert.alert(
      "Show the voice entry notice again?",
      "The privacy notice will appear the next time you speak to create an entry.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Show again",
          onPress: () => void performResetVoiceEntryConsent(),
        },
      ],
    );
  }

  async function performResetVoiceEntryConsent() {
    try {
      await resetVoiceEntryConsent();
      setVoiceEntryConsentState("not-acknowledged");
    } catch (error: unknown) {
      console.warn(
        "Failed to reset voice entry consent notice:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  async function handleExport() {
    if (exportState === "exporting") {
      return;
    }
    setExportState("exporting");
    try {
      await exportLocalData();
      setExportState("done");
    } catch (error: unknown) {
      // Never log exported content — only an error category.
      console.warn(
        "Failed to export local data:",
        error instanceof Error ? error.message : "unknown error",
      );
      setExportState("error");
    }
  }

  function confirmDelete() {
    if (deleteState === "deleting") {
      return;
    }
    Alert.alert(
      "Delete all local data?",
      "This removes every reflection, prayer request, gratitude, testimony, and voice recording from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: confirmDeleteFinal,
        },
      ],
    );
  }

  function confirmDeleteFinal() {
    Alert.alert(
      "This cannot be undone",
      "Your local data will be permanently cleared from this device. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => {
            void handleDelete();
          },
        },
      ],
    );
  }

  async function handleDelete() {
    setDeleteState("deleting");
    try {
      await deleteAllLocalData();
      // Delete also resets device-local preferences, so reflect the fresh
      // state here without waiting for a refocus.
      setConsentState("not-acknowledged");
      setTranscriptionConsentState("not-acknowledged");
      setVoiceEntryConsentState("not-acknowledged");
      setDeleteState("done");
    } catch (error: unknown) {
      console.warn(
        "Failed to delete local data:",
        error instanceof Error ? error.message : "unknown error",
      );
      setDeleteState("error");
    }
  }

  // Opens the user's mail app with a prefilled, content-free message. If no mail
  // app is available (common on simulators), the same text is copied to the
  // clipboard so the tester can paste it into an email themselves. Nothing is
  // ever sent automatically — the tester chooses to send.
  async function openMailOrCopy(
    subject: string,
    body: string,
    contextLabel: string,
  ) {
    const url = buildMailtoUrl(SUPPORT_EMAIL, subject, body);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        setHelpMessage(null);
        return;
      }
    } catch {
      // Fall through to the clipboard fallback below.
    }

    try {
      await Clipboard.setStringAsync(
        `To: ${SUPPORT_EMAIL}\nSubject: ${subject}\n\n${body}`,
      );
      setHelpMessage({
        kind: "info",
        text: `No mail app found, so your ${contextLabel} was copied. Paste it into an email to ${SUPPORT_EMAIL}.`,
      });
    } catch {
      setHelpMessage({
        kind: "error",
        text: "Couldn't open mail or copy just now. Please try again.",
      });
    }
  }

  async function handleSendFeedback() {
    await openMailOrCopy(
      `${APP_NAME} feedback`,
      buildFeedbackBody(),
      "feedback note",
    );
  }

  async function handleReportBug() {
    const body = buildBugReportBody(getDiagnosticInfo());
    await openMailOrCopy(`${APP_NAME} bug report`, body, "bug report");
  }

  async function handleCopyDiagnostics() {
    try {
      await Clipboard.setStringAsync(formatDiagnostics(getDiagnosticInfo()));
      setHelpMessage({
        kind: "success",
        text: "Diagnostic info copied. It contains only safe app details — no personal content.",
      });
    } catch {
      setHelpMessage({
        kind: "error",
        text: "Couldn't copy diagnostics just now. Please try again.",
      });
    }
  }

  return (
    <Screen
      title="Settings"
      subtitle="Privacy and your local data — kept clear and understandable."
    >
      <Section title="Privacy & Local Data">
        <SettingsRow
          title="Saved on this device"
          description="Your reflections, prayers, gratitudes, testimonies, lessons, and voice recordings are stored locally on this device."
        />
        <SettingsRow
          title="Recordings stay on this device until you choose a voice action"
          description="Your voice recordings are kept on this device. A recording is only sent anywhere when you choose a voice AI action — transcribing a reflection, or speaking to create a prayer, gratitude, testimony, or lesson."
        />
        <SettingsRow
          title="Only what you choose leaves your device"
          description="Your content stays on this device, except what you explicitly send: the reflection text you send for AI analysis, and the audio you send when you transcribe a reflection or speak to create an entry. Sync and backup are not enabled."
        />
        <SettingsRow
          title="If you remove the app"
          description="Deleting Graceward may remove local data unless your device backup restores it."
        />
      </Section>

      <Section title="Audio Retention">
        <SettingsRow
          title="Journal recordings are kept on this device"
          description="When you record a voice reflection, that recording is saved on this device so you can play it back."
        />
        <SettingsRow
          title="Journal transcription: audio is sent, then kept"
          description="A voice reflection is never transcribed automatically. When you choose to transcribe one, only that selected recording is sent to Graceward's transcription service to be converted to text. The transcript is saved into that journal entry, and your original recording stays on this device — transcribing never deletes it."
        />
        <SettingsRow
          title="Speaking to create an entry: audio is sent, then discarded"
          description="When you speak to create a prayer, gratitude, testimony, or lesson, that recording is sent to Graceward to turn into text and organize into the entry's fields. You review and save the text. The recording isn't kept afterward — it's discarded once the entry has been prepared, and it isn't included in your data export."
        />
        <SettingsRow
          title="Audio retention controls are coming later"
          description="For now, journal recordings stay on this device until you delete them. Options to manage or automatically remove audio are coming later."
        />
        <SettingsRow
          title="Cloud upload"
          description="Cloud sync and backup aren't implemented. Audio only leaves your device when you choose to transcribe a recording or speak to create an entry."
        />
      </Section>

      <Section title="Export Data">
        <Text style={styles.paragraph}>
          Create a JSON file of your reflections, prayer requests, gratitudes,
          testimonies, and audio details (not the recordings
          themselves). You choose where it goes from the share sheet.
        </Text>
        <Button
          label="Export local data"
          variant="secondary"
          onPress={handleExport}
          loading={exportState === "exporting"}
        />
        {exportState === "done" ? (
          <Text style={styles.successText}>
            Export ready. Choose where to save or send it.
          </Text>
        ) : null}
        {exportState === "error" ? (
          <Text style={styles.errorText}>
            Could not prepare the export just now. Please try again.
          </Text>
        ) : null}
      </Section>

      <Section title="Delete Local Data">
        <Card
          variant="subtle"
          title="Delete all local data"
          description="This permanently clears everything stored on this device. It cannot be undone."
        />
        <Text style={styles.warningText}>
          This is permanent and only affects this device.
        </Text>
        <Button
          label="Delete all local data"
          variant="destructive"
          onPress={confirmDelete}
          loading={deleteState === "deleting"}
        />
        {deleteState === "done" ? (
          <Text style={styles.successText}>
            All local data has been cleared from this device.
          </Text>
        ) : null}
        {deleteState === "error" ? (
          <Text style={styles.errorText}>
            Could not clear local data just now. Please try again.
          </Text>
        ) : null}
      </Section>

      <Section title="AI & Cloud">
        <SettingsRow
          title="AI reflections are manual"
          description="AI reflections run only when you choose them. Automatic analysis is not enabled."
        />
        <SettingsRow
          title="What is sent for AI"
          description="When you choose an AI reflection, the text of that reflection is sent to Graceward's AI service. Audio is sent only for the voice actions described below, and only when you choose them."
        />
        <SettingsRow
          title="Voice transcription is manual"
          description="A voice reflection is never transcribed automatically. When you choose to transcribe one, the selected audio is sent to Graceward's transcription service, the transcript is saved into that journal entry, and it's then eligible for AI reflection."
        />
        <SettingsRow
          title="Speaking to create an entry is manual"
          description="Speaking to create a prayer, gratitude, testimony, or lesson runs only when you choose it. The selected recording is sent to Graceward to turn into text and organize into the entry's fields for you to review and save; the recording is then discarded."
        />
        <SettingsRow
          title="AI reflection privacy notice"
          description={
            consentState === "acknowledged"
              ? "Acknowledged. The privacy notice won't show before each AI reflection."
              : "Not acknowledged yet. The privacy notice will show the first time you reflect with Graceward."
          }
        />
        {consentState === "acknowledged" ? (
          <Button
            label="Reset AI consent notice"
            variant="secondary"
            onPress={handleResetConsent}
          />
        ) : null}
        <SettingsRow
          title="Transcription privacy notice"
          description={
            transcriptionConsentState === "acknowledged"
              ? "Acknowledged. The privacy notice won't show before each transcription."
              : "Not acknowledged yet. The privacy notice will show the first time you transcribe a voice reflection."
          }
        />
        {transcriptionConsentState === "acknowledged" ? (
          <Button
            label="Reset transcription consent notice"
            variant="secondary"
            onPress={handleResetTranscriptionConsent}
          />
        ) : null}
        <SettingsRow
          title="Voice entry privacy notice"
          description={
            voiceEntryConsentState === "acknowledged"
              ? "Acknowledged. The privacy notice won't show before each voice-created entry."
              : "Not acknowledged yet. The privacy notice will show the first time you speak to create an entry."
          }
        />
        {voiceEntryConsentState === "acknowledged" ? (
          <Button
            label="Reset voice entry consent notice"
            variant="secondary"
            onPress={handleResetVoiceEntryConsent}
          />
        ) : null}
        <Card
          variant="subtle"
          eyebrow="Coming later"
          title="Cloud features aren't enabled yet"
          description="Cloud sync and backup are not turned on. When they arrive, they'll be clearly explained and optional."
        />
      </Section>

      <Section title="Help & Feedback">
        <Text style={styles.paragraph}>
          You&apos;re part of an early closed beta. Your thoughts help shape
          Graceward. Nothing is sent automatically — you choose what to share.
        </Text>
        <Button
          label="Send feedback"
          variant="secondary"
          onPress={handleSendFeedback}
        />
        <Button
          label="Report a bug"
          variant="secondary"
          onPress={handleReportBug}
        />
        <Button
          label="Copy diagnostic info"
          variant="secondary"
          onPress={handleCopyDiagnostics}
        />
        {helpMessage ? (
          <Text
            style={
              helpMessage.kind === "error"
                ? styles.errorText
                : helpMessage.kind === "info"
                  ? styles.paragraph
                  : styles.successText
            }
          >
            {helpMessage.text}
          </Text>
        ) : null}
        <SettingsRow
          title="What a bug report includes"
          description="Only safe app details: version, build, platform, OS, which API environment you're on (host only), and a timestamp. It never includes your reflections, prayers, gratitudes, testimonies, audio, transcripts, or AI responses — and no API keys or secrets."
        />
      </Section>

      <Section title="About">
        <View style={styles.aboutCard}>
          <Text style={styles.aboutName}>{APP_NAME}</Text>
          <Text style={styles.aboutTagline}>{APP_TAGLINE}</Text>
          <Text style={styles.aboutVersion}>{appVersionLabel}</Text>
          <Text style={styles.aboutNote}>
            Graceward is local-first. Your reflections live on your device.
          </Text>
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  successText: {
    ...typography.bodySmall,
    color: colors.answeredPrayerAccent,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
  },
  aboutCard: {
    gap: spacing.sm,
  },
  aboutName: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  aboutTagline: {
    ...typography.body,
    color: colors.textMuted,
  },
  aboutVersion: {
    ...typography.bodySmall,
    color: colors.textSubtle,
  },
  aboutNote: {
    ...typography.bodySmall,
    color: colors.textSubtle,
  },
});
