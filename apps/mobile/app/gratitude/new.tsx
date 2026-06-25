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
import { PolishWithAi } from "@/components/entry/PolishWithAi";
import { VoiceEntryCapture } from "@/components/entry/VoiceEntryCapture";
import { TagEditor } from "@/components/tags/TagEditor";
import { createGratitude, toLocalDateString } from "@/lib/db";
import { hasTypedEntryContent, suggestionTags } from "@/lib/voice-entry-fields";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function NewGratitudeScreen() {
  const { sourceJournalEntryId } = useLocalSearchParams<{
    sourceJournalEntryId?: string;
  }>();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canSave = content.trim().length > 0 && !saving;
  const { allowNextNavigation } = useUnsavedChangesGuard(
    !saving && (hasTypedEntryContent([content]) || tags.length > 0),
  );

  function handleStructured(result: StructureVoiceEntryResponse) {
    if (result.entryType !== "gratitude") {
      return;
    }
    setContent(result.fields.content);
    setTags(suggestionTags(result.fields));
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await createGratitude({
        content: content.trim(),
        tags,
        journalEntryId: sourceJournalEntryId ?? null,
        syncStatus: "local_only",
      });
      allowNextNavigation();
      router.replace({
        pathname: "/(tabs)/gratitude",
        params: { segment: "gratitude" },
      });
    } catch (error: unknown) {
      // Never log raw gratitude content — only an error category.
      console.warn(
        "Failed to save gratitude:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "Your gratitude could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <FlowScreen
      title="Add gratitude"
      subtitle="Name something specific you're thankful for today."
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
          entryType="gratitude"
          entryDate={toLocalDateString(new Date())}
          onStructured={handleStructured}
          hasExistingInput={hasTypedEntryContent([content]) || tags.length > 0}
        />

        <PolishWithAi
          entryType="gratitude"
          entryDate={toLocalDateString(new Date())}
          getText={() => content}
          disabled={saving}
          onApplyContent={setContent}
          onApplyTags={setTags}
          getCurrentValues={() => ({ content, tags })}
          contentNoun="gratitude"
        />

        <View style={styles.field}>
          <Text style={styles.label}>What are you grateful for?</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="A specific mercy, gift, or kindness from today…"
              placeholderTextColor={colors.textSubtle}
              multiline
              autoFocus
              textAlignVertical="top"
              style={styles.contentInput}
              accessibilityLabel="Gratitude content"
            />
          </View>
        </View>

        <View style={styles.field}>
          <TagEditor
            value={tags}
            onChange={setTags}
            placeholder="e.g. Family, Provision, Health"
          />
        </View>

        <Text style={styles.hint}>Saved privately on this device only.</Text>
        <Button
          label="Save gratitude"
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
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
});
