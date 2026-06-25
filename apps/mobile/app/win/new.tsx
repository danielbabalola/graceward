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
import { createWin, toLocalDateString } from "@/lib/db";
import { hasTypedEntryContent, suggestionTags } from "@/lib/voice-entry-fields";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function NewWinScreen() {
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
    if (result.entryType !== "faithfulness") {
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
      await createWin({
        content: content.trim(),
        tags,
        journalEntryId: sourceJournalEntryId ?? null,
        syncStatus: "local_only",
      });
      allowNextNavigation();
      router.replace({
        pathname: "/(tabs)/gratitude",
        params: { segment: "faithfulness" },
      });
    } catch (error: unknown) {
      // Never log raw faithfulness content — only an error category.
      console.warn(
        "Failed to save faithfulness moment:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "This testimony could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <FlowScreen
      title="Add testimony"
      subtitle="Mark a major moment of God's faithfulness — His provision, a milestone, deliverance, or an answered prayer."
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
          entryType="faithfulness"
          entryDate={toLocalDateString(new Date())}
          onStructured={handleStructured}
          hasExistingInput={hasTypedEntryContent([content]) || tags.length > 0}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Where did you see God's goodness?</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Something that went well, or a way God showed up…"
              placeholderTextColor={colors.textSubtle}
              multiline
              autoFocus
              textAlignVertical="top"
              style={styles.contentInput}
              accessibilityLabel="Testimony"
            />
          </View>
        </View>

        <View style={styles.field}>
          <TagEditor
            value={tags}
            onChange={setTags}
            placeholder="e.g. Provision, Healing, Perseverance"
          />
        </View>

        <Text style={styles.hint}>Saved privately on this device only.</Text>
        <Button
          label="Save testimony"
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
