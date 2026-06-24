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
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { createWin } from "@/lib/db";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function NewWinScreen() {
  const [content, setContent] = useState("");
  const [theme, setTheme] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = content.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await createWin({
        content: content.trim(),
        faithfulnessTheme: theme.trim().length > 0 ? theme.trim() : null,
        syncStatus: "local_only",
      });
      router.replace("/(tabs)/gratitude");
    } catch (error: unknown) {
      // Never log raw win content — only an error category.
      console.warn(
        "Failed to save win:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "Your win could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <FlowScreen
      title="Add win"
      subtitle="Notice where you saw God at work — not a scoreboard, just His goodness."
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
              accessibilityLabel="Win content"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Theme (optional)</Text>
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
          label="Save win"
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
