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
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import { VoiceEntryCapture } from "@/components/entry/VoiceEntryCapture";
import { TagEditor } from "@/components/tags/TagEditor";
import { createLesson, toLocalDateString } from "@/lib/db";
import { hasTypedEntryContent, suggestionTags } from "@/lib/voice-entry-fields";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function NewLessonScreen() {
  const { sourceJournalEntryId } = useLocalSearchParams<{
    sourceJournalEntryId?: string;
  }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && content.trim().length > 0 && !saving;
  const { allowNextNavigation } = useUnsavedChangesGuard(
    !saving && (hasTypedEntryContent([title, content]) || tags.length > 0),
  );

  function handleStructured(result: StructureVoiceEntryResponse) {
    if (result.entryType !== "lesson") {
      return;
    }
    setTitle(result.fields.title);
    setContent(result.fields.content);
    setTags(suggestionTags(result.fields));
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await createLesson({
        title: title.trim(),
        content: content.trim(),
        tags,
        sourceJournalEntryId: sourceJournalEntryId ?? null,
        status: "active",
        syncStatus: "local_only",
      });
      allowNextNavigation();
      router.replace({
        pathname: "/(tabs)/gratitude",
        params: { segment: "lessons" },
      });
    } catch (error: unknown) {
      // Never log raw lesson content — only an error category.
      console.warn(
        "Failed to save lesson:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "This lesson could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <FlowScreen
      title="Save a lesson"
      subtitle="Notice what you're learning, or something God may be forming in you. Held humbly, in your own words."
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
          entryType="lesson"
          entryDate={toLocalDateString(new Date())}
          onStructured={handleStructured}
          hasExistingInput={
            hasTypedEntryContent([title, content]) || tags.length > 0
          }
        />

        <View style={styles.field}>
          <Text style={styles.label}>A lesson I'm noticing</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="A short name for this lesson…"
              placeholderTextColor={colors.textSubtle}
              autoFocus
              style={styles.singleLineInput}
              accessibilityLabel="Lesson title"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What I'm learning</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="In your own words — what you're noticing or sensing God may be forming in you…"
              placeholderTextColor={colors.textSubtle}
              multiline
              textAlignVertical="top"
              style={styles.contentInput}
              accessibilityLabel="Lesson content"
            />
          </View>
        </View>

        <View style={styles.field}>
          <TagEditor
            value={tags}
            onChange={setTags}
            placeholder="e.g. Trust, Patience, Surrender"
          />
        </View>

        <Text style={styles.hint}>Saved privately on this device only.</Text>
        <Button
          label="Save lesson"
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
