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
import { createPrayerRequest } from "@/lib/db";
import { isValidDateOnly } from "@/lib/prayer-display";
import { colors, radii, spacing, typography } from "@/theme/tokens";

export default function NewPrayerRequestScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  const trimmedTitle = title.trim();
  const trimmedFollowUp = followUp.trim();
  const followUpValid =
    trimmedFollowUp.length === 0 || isValidDateOnly(trimmedFollowUp);
  const canSave = trimmedTitle.length > 0 && followUpValid && !saving;

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
        followUpAt: trimmedFollowUp.length > 0 ? trimmedFollowUp : null,
        status: "active",
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

        <View style={styles.field}>
          <Text style={styles.label}>Follow-up date (optional)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={followUp}
              onChangeText={setFollowUp}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={styles.titleInput}
              accessibilityLabel="Follow-up date"
            />
          </View>
          {!followUpValid ? (
            <Text style={styles.errorHint}>
              Please use the format YYYY-MM-DD, or leave this blank.
            </Text>
          ) : null}
        </View>

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
