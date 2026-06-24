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
import { createWin, toLocalDateString } from "@/lib/db";
import { hasTypedEntryContent } from "@/lib/voice-entry-fields";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function NewWinScreen() {
  const { sourceJournalEntryId } = useLocalSearchParams<{
    sourceJournalEntryId?: string;
  }>();
  const [content, setContent] = useState("");
  const [theme, setTheme] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = content.trim().length > 0 && !saving;

  function handleStructured(result: StructureVoiceEntryResponse) {
    if (result.entryType !== "faithfulness") {
      return;
    }
    setContent(result.fields.content);
    setTheme(result.fields.faithfulnessTheme ?? "");
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await createWin({
        content: content.trim(),
        faithfulnessTheme: theme.trim().length > 0 ? theme.trim() : null,
        journalEntryId: sourceJournalEntryId ?? null,
        syncStatus: "local_only",
      });
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
        "This faithfulness moment could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <FlowScreen
      title="Add faithfulness moment"
      subtitle="Notice where you saw God's goodness — His provision, growth, help, or an answered prayer."
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
          hasExistingInput={hasTypedEntryContent([content, theme])}
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
              accessibilityLabel="Faithfulness moment"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Faithfulness theme (optional)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={theme}
              onChangeText={setTheme}
              placeholder="e.g. Provision, Healing, Perseverance"
              placeholderTextColor={colors.textSubtle}
              style={styles.singleLineInput}
              accessibilityLabel="Faithfulness theme"
            />
          </View>
        </View>

        <Text style={styles.hint}>Saved privately on this device only.</Text>
        <Button
          label="Save faithfulness moment"
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
