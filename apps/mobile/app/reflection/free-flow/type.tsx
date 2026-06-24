import { useState } from "react";
import {
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
import { ReflectionDateSelector } from "@/components/reflection/ReflectionDateSelector";
import { createJournalEntry, toLocalDateString } from "@/lib/db";
import { handleReflectionSaveError } from "@/lib/reflection-save";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function FreeFlowTypeScreen() {
  const [text, setText] = useState("");
  const [entryDate, setEntryDate] = useState(() =>
    toLocalDateString(new Date()),
  );
  const [saving, setSaving] = useState(false);

  const canSave = text.trim().length > 0 && !saving;

  async function handleSave() {
    const trimmed = text.trim();
    if (trimmed.length === 0 || saving) {
      return;
    }

    setSaving(true);
    try {
      await createJournalEntry({
        reflectionPath: "free_flow",
        mode: "free_flow",
        inputType: "text",
        rawText: trimmed,
        entryDate,
        status: "saved",
        syncStatus: "local_only",
      });
      router.replace("/(tabs)/journal");
    } catch (error: unknown) {
      handleReflectionSaveError(error);
      setSaving(false);
    }
  }

  return (
    <FlowScreen
      title="Free Flow · Type"
      subtitle="Write freely. You do not need perfect words."
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ReflectionDateSelector value={entryDate} onChange={setEntryDate} />
        <View style={styles.editorWrapper}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What's on your heart today?"
            placeholderTextColor={colors.textSubtle}
            multiline
            autoFocus
            textAlignVertical="top"
            style={styles.input}
            accessibilityLabel="Reflection text"
          />
        </View>
        <Text style={styles.hint}>
          Saved privately on this device only.
        </Text>
        <Button
          label="Save reflection"
          onPress={handleSave}
          disabled={!canSave}
          loading={saving}
        />
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  editorWrapper: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 220,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
});
