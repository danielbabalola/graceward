import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/ui/Button";
import {
  hasMeaningfulAnswer,
  type GuidedAnswers,
  type GuidedModeConfig,
} from "@/lib/reflection-flow";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type GuidedPromptEditorProps = {
  config: GuidedModeConfig;
  initialAnswers?: GuidedAnswers;
  saveLabel: string;
  onSave: (answers: GuidedAnswers) => Promise<void>;
  onCancel?: () => void;
};

/**
 * One-prompt-at-a-time editor shared by the new guided Type flow and the
 * structured edit flow. Preserves answers while navigating between prompts and
 * allows saving once at least one answer has meaningful text.
 */
export function GuidedPromptEditor({
  config,
  initialAnswers,
  saveLabel,
  onSave,
  onCancel,
}: GuidedPromptEditorProps) {
  const [answers, setAnswers] = useState<GuidedAnswers>(initialAnswers ?? {});
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const total = config.prompts.length;
  const prompt = config.prompts[index];

  const canSave = useMemo(
    () => hasMeaningfulAnswer(config, answers) && !saving,
    [config, answers, saving],
  );

  const isFirst = index === 0;
  const isLast = index === total - 1;

  function updateAnswer(value: string) {
    if (!prompt) {
      return;
    }
    setAnswers((prev) => ({ ...prev, [prompt.id]: value }));
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await onSave(answers);
      // Parent handles navigation / closing the editor on success.
    } catch (error: unknown) {
      console.warn(
        "Failed to save guided reflection:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "Your reflection could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  if (!prompt) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {config.note ? (
        <View
          style={[
            styles.note,
            config.accentColor ? { borderLeftColor: config.accentColor } : null,
          ]}
        >
          <Text style={styles.noteText}>{config.note}</Text>
        </View>
      ) : null}

      <Text style={styles.progress}>
        {index + 1} of {total}
      </Text>

      <Text style={styles.label}>{prompt.label}</Text>
      <View style={styles.editorWrapper}>
        <TextInput
          key={prompt.id}
          value={answers[prompt.id] ?? ""}
          onChangeText={updateAnswer}
          placeholder={prompt.placeholder}
          placeholderTextColor={colors.textSubtle}
          multiline
          autoFocus
          textAlignVertical="top"
          style={styles.input}
          accessibilityLabel={prompt.label}
        />
      </View>

      <View style={styles.navRow}>
        <View style={styles.navItem}>
          <Button
            label="Back"
            variant="secondary"
            onPress={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={isFirst || saving}
          />
        </View>
        <View style={styles.navItem}>
          <Button
            label="Next"
            variant="secondary"
            onPress={() => setIndex((value) => Math.min(total - 1, value + 1))}
            disabled={isLast || saving}
          />
        </View>
      </View>

      <Text style={styles.hint}>
        Saved privately on this device only. You can leave any prompt blank.
      </Text>

      <Button
        label={saveLabel}
        onPress={handleSave}
        disabled={!canSave}
        loading={saving}
        style={styles.action}
      />
      {onCancel ? (
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          disabled={saving}
          style={styles.action}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.lamentAccent,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  progress: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.sectionTitle,
    color: colors.text,
    marginBottom: spacing.md,
  },
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
    minHeight: 160,
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  navItem: {
    flex: 1,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
  action: {
    marginBottom: spacing.sm,
  },
});
