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
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { createJournalEntry } from "@/lib/db";
import {
  compileGuidedReflection,
  deriveGuidedTitle,
  guidedModeConfigs,
  hasMeaningfulAnswer,
  isGuidedMode,
  type GuidedAnswers,
} from "@/lib/reflection-flow";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function GuidedTypeScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();

  if (!mode || !isGuidedMode(mode)) {
    return <Redirect href="/reflection/guided/mode" />;
  }

  const config = guidedModeConfigs[mode];

  return <GuidedTypeForm config={config} />;
}

function GuidedTypeForm({
  config,
}: {
  config: (typeof guidedModeConfigs)[keyof typeof guidedModeConfigs];
}) {
  const [answers, setAnswers] = useState<GuidedAnswers>({});
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () => hasMeaningfulAnswer(config, answers) && !saving,
    [config, answers, saving],
  );

  function updateAnswer(promptId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [promptId]: value }));
  }

  async function handleSave() {
    if (!hasMeaningfulAnswer(config, answers) || saving) {
      return;
    }

    setSaving(true);
    try {
      await createJournalEntry({
        reflectionPath: "guided",
        mode: config.mode,
        inputType: "text",
        rawText: compileGuidedReflection(config, answers),
        title: deriveGuidedTitle(config, answers),
        status: "saved",
        syncStatus: "local_only",
      });
      router.replace("/(tabs)/journal");
    } catch (error: unknown) {
      // Never log raw reflection content — only an error category.
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

  return (
    <FlowScreen title={config.title} subtitle={config.helper}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {config.note ? (
          <View
            style={[
              styles.note,
              config.accentColor
                ? { borderLeftColor: config.accentColor }
                : null,
            ]}
          >
            <Text style={styles.noteText}>{config.note}</Text>
          </View>
        ) : null}

        {config.prompts.map((prompt) => (
          <View key={prompt.id} style={styles.field}>
            <Text style={styles.label}>{prompt.label}</Text>
            <View style={styles.editorWrapper}>
              <TextInput
                value={answers[prompt.id] ?? ""}
                onChangeText={(value) => updateAnswer(prompt.id, value)}
                placeholder={prompt.placeholder}
                placeholderTextColor={colors.textSubtle}
                multiline
                textAlignVertical="top"
                style={styles.input}
                accessibilityLabel={prompt.label}
              />
            </View>
          </View>
        ))}

        <Text style={styles.hint}>
          Saved privately on this device only. You can leave any prompt blank.
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
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  editorWrapper: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 96,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
});
