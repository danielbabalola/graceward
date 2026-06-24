import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Section } from "@/components/ui/Section";
import { SettingsRow } from "@/components/ui/SettingsRow";
import {
  deleteAllLocalData,
  hasAcknowledgedAiReflectionConsent,
  resetAiReflectionConsent,
} from "@/lib/db";
import { exportLocalData } from "@/lib/local-data-export";
import { colors, spacing, typography } from "@/theme/tokens";

type ExportState = "idle" | "exporting" | "done" | "error";
type DeleteState = "idle" | "deleting" | "done" | "error";
type ConsentState = "loading" | "acknowledged" | "not-acknowledged";

export default function SettingsScreen() {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [consentState, setConsentState] = useState<ConsentState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const acknowledged = await hasAcknowledgedAiReflectionConsent();
          if (active) {
            setConsentState(acknowledged ? "acknowledged" : "not-acknowledged");
          }
        } catch {
          // Treat a read failure as not acknowledged so the notice still shows.
          if (active) {
            setConsentState("not-acknowledged");
          }
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  async function handleResetConsent() {
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
      "This removes every reflection, prayer request, gratitude, faithfulness moment, and voice recording from this device.",
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
      setDeleteState("done");
    } catch (error: unknown) {
      console.warn(
        "Failed to delete local data:",
        error instanceof Error ? error.message : "unknown error",
      );
      setDeleteState("error");
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
          description="Your reflections, prayers, gratitudes, and faithfulness moments are stored locally on this device."
        />
        <SettingsRow
          title="Voice stays local"
          description="Voice recordings are kept on this device only."
        />
        <SettingsRow
          title="Nothing is uploaded yet"
          description="Nothing is sent anywhere for AI, sync, or backup."
        />
        <SettingsRow
          title="If you remove the app"
          description="Deleting Graceward may remove local data unless your device backup restores it."
        />
      </Section>

      <Section title="Audio Retention">
        <SettingsRow
          title="Kept on this device"
          description="Voice recordings remain on this device after you save them."
        />
        <SettingsRow
          title="Transcription"
          description="Transcription isn't available yet."
        />
        <SettingsRow
          title="Cloud upload"
          description="Cloud upload isn't implemented. Audio never leaves your device."
        />
      </Section>

      <Section title="Export Data">
        <Text style={styles.paragraph}>
          Create a JSON file of your reflections, prayer requests, gratitudes,
          faithfulness moments, and audio details (not the recordings
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
          title="Privacy notice"
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
        <Card
          variant="subtle"
          eyebrow="Coming later"
          title="Cloud features aren't enabled yet"
          description="Transcription, cloud sync, and backup are not turned on. When they arrive, they'll be clearly explained and optional."
        />
      </Section>

      <Section title="About">
        <View style={styles.aboutCard}>
          <Text style={styles.aboutName}>Graceward</Text>
          <Text style={styles.aboutTagline}>
            Pause. Reflect. Remember God&apos;s faithfulness.
          </Text>
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
  aboutNote: {
    ...typography.bodySmall,
    color: colors.textSubtle,
  },
});
