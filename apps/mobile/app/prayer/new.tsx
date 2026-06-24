import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { StructureVoiceEntryResponse } from "@graceward/ai-schemas";
import { Button } from "@/components/ui/Button";
import { DateSelector } from "@/components/ui/DateSelector";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import { VoiceEntryCapture } from "@/components/entry/VoiceEntryCapture";
import { createPrayerRequest, toLocalDateString } from "@/lib/db";
import { hasTypedEntryContent, safeFollowUpDate } from "@/lib/voice-entry-fields";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function NewPrayerRequestScreen() {
  const { sourceJournalEntryId } = useLocalSearchParams<{
    sourceJournalEntryId?: string;
  }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmedTitle = title.trim();
  const canSave = trimmedTitle.length > 0 && !saving;

  function handleStructured(result: StructureVoiceEntryResponse) {
    if (result.entryType !== "prayer") {
      return;
    }
    setTitle(result.fields.title);
    setDescription(result.fields.description ?? "");
    // Defense-in-depth: never accept an inferred or past follow-up date.
    setFollowUp(safeFollowUpDate(result.fields.followUpAt));
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await createPrayerRequest({
        title: trimmedTitle,
        description:
          description.trim().length > 0 ? description.trim() : null,
        followUpAt: followUp,
        status: "active",
        sourceJournalEntryId: sourceJournalEntryId ?? null,
        syncStatus: "local_only",
      });
      router.replace("/(tabs)/prayer");
    } catch (error: unknown) {
      // Never log raw prayer content — only an error category.
      console.warn(
        "Failed to save prayer request:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "Your prayer request could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <FlowScreen
      title="Add prayer request"
      subtitle="Bring something before God in your own words."
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {sourceJournalEntryId ? (
          <SourceReflectionLink
            journalEntryId={sourceJournalEntryId}
            pressable={false}
          />
        ) : null}

        <VoiceEntryCapture
          entryType="prayer"
          entryDate={toLocalDateString(new Date())}
          onStructured={handleStructured}
          hasExistingInput={hasTypedEntryContent([title, description])}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What are you praying for?"
              placeholderTextColor={colors.textSubtle}
              autoFocus
              style={styles.titleInput}
              accessibilityLabel="Prayer request title"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Details (optional)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Anything more you'd like to remember or bring before God…"
              placeholderTextColor={colors.textSubtle}
              multiline
              textAlignVertical="top"
              style={styles.descriptionInput}
              accessibilityLabel="Prayer request details"
            />
          </View>
        </View>

        <DateSelector
          label="Follow-up date (optional)"
          value={followUp}
          onChange={setFollowUp}
          disablePast
          allowClear
          emptyLabel="No follow-up date"
          hint="Choose when you'd like to revisit this. Today or a future day."
        />

        <Text style={styles.hint}>
          Saved privately on this device only.
        </Text>
        <Button
          label="Save prayer request"
          onPress={handleSave}
          disabled={!canSave}
          loading={saving}
        />
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  titleInput: {
    ...typography.body,
    color: colors.text,
  },
  descriptionInput: {
    ...typography.body,
    color: colors.text,
    minHeight: 120,
  },
  errorHint: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
    marginTop: spacing.sm,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
});
