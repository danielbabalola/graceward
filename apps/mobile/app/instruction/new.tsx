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
import { TagEditor } from "@/components/tags/TagEditor";
import { createInstruction, toLocalDateString } from "@/lib/db";
import {
  hasTypedEntryContent,
  safeFollowUpDate,
  suggestionTags,
} from "@/lib/voice-entry-fields";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function NewInstructionScreen() {
  const { sourceJournalEntryId } = useLocalSearchParams<{
    sourceJournalEntryId?: string;
  }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && content.trim().length > 0 && !saving;
  const { allowNextNavigation } = useUnsavedChangesGuard(
    !saving &&
      (hasTypedEntryContent([title, content]) ||
        tags.length > 0 ||
        dueAt !== null),
  );

  function handleStructured(result: StructureVoiceEntryResponse) {
    if (result.entryType !== "instruction") {
      return;
    }
    setTitle(result.fields.title);
    setContent(result.fields.content);
    setTags(suggestionTags(result.fields));
    // Defense-in-depth: never accept an inferred or past target date.
    setDueAt(safeFollowUpDate(result.fields.dueAt));
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await createInstruction({
        title: title.trim(),
        content: content.trim(),
        dueAt,
        tags,
        sourceJournalEntryId: sourceJournalEntryId ?? null,
        status: "active",
        syncStatus: "local_only",
      });
      allowNextNavigation();
      router.replace({
        pathname: "/(tabs)/gratitude",
        params: { segment: "instructions" },
      });
    } catch (error: unknown) {
      // Never log raw instruction content — only an error category.
      console.warn(
        "Failed to save instruction:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "This instruction could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <FlowScreen
      title="Save an instruction"
      subtitle="Record what you believe God is asking you to do. Held humbly, in your own words."
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
          entryType="instruction"
          entryDate={toLocalDateString(new Date())}
          onStructured={handleStructured}
          hasExistingInput={
            hasTypedEntryContent([title, content]) || tags.length > 0
          }
        />

        <View style={styles.field}>
          <Text style={styles.label}>An instruction I'm holding</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="A short name for this instruction…"
              placeholderTextColor={colors.textSubtle}
              autoFocus
              style={styles.singleLineInput}
              accessibilityLabel="Instruction title"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What I sense I'm being asked to do</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="In your own words — what you believe God is asking of you…"
              placeholderTextColor={colors.textSubtle}
              multiline
              textAlignVertical="top"
              style={styles.contentInput}
              accessibilityLabel="Instruction content"
            />
          </View>
        </View>

        <View style={styles.field}>
          <TagEditor
            value={tags}
            onChange={setTags}
            placeholder="e.g. Obedience, Generosity, Step of faith"
          />
        </View>

        <DateSelector
          label="By when (optional)"
          value={dueAt}
          onChange={setDueAt}
          disablePast
          allowClear
          emptyLabel="No target date"
          hint="If you sense a timeframe, set a gentle day to aim for. Today or later."
        />

        <Text style={styles.hint}>Saved privately on this device only.</Text>
        <Button
          label="Save instruction"
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
  contentInput: {
    ...typography.body,
    color: colors.text,
    minHeight: 120,
  },
  singleLineInput: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
});
