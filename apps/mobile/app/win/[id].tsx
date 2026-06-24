import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Win } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { getWinById, softDeleteWin, updateWin } from "@/lib/db";
import { formatItemDate } from "@/lib/gratitude-display";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";

export default function WinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [win, setWin] = useState<Win | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [editing, setEditing] = useState(false);

  const [contentDraft, setContentDraft] = useState("");
  const [themeDraft, setThemeDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!id) {
        setLoadState("not-found");
        return;
      }
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));

      (async () => {
        try {
          const result = await getWinById(id);
          if (!active) {
            return;
          }
          if (!result) {
            setLoadState("not-found");
            return;
          }
          setWin(result);
          setLoadState("ready");
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load win:",
            error instanceof Error ? error.message : "unknown error",
          );
        }
      })();

      return () => {
        active = false;
      };
    }, [id]),
  );

  function startEditing() {
    if (!win) {
      return;
    }
    setContentDraft(win.content);
    setThemeDraft(win.faithfulnessTheme ?? "");
    setEditing(true);
  }

  async function handleSave() {
    if (!win || contentDraft.trim().length === 0 || saving) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateWin(win.id, {
        content: contentDraft.trim(),
        faithfulnessTheme:
          themeDraft.trim().length > 0 ? themeDraft.trim() : null,
      });
      if (updated) {
        setWin(updated);
      }
      setEditing(false);
    } catch (error: unknown) {
      console.warn(
        "Failed to update win:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "Your changes could not be saved just now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!win) {
      return;
    }
    Alert.alert("Delete this win?", "It will be removed from your device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void handleDelete();
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!win || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await softDeleteWin(win.id);
      router.replace("/(tabs)/gratitude");
    } catch (error: unknown) {
      console.warn(
        "Failed to delete win:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not delete",
        "This win could not be removed just now. Please try again.",
      );
      setDeleting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title="Win">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title="Win">
        <Text style={styles.stateText}>
          This win could not be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !win) {
    return (
      <FlowScreen title="Win">
        <Text style={styles.stateText}>This win is no longer available.</Text>
      </FlowScreen>
    );
  }

  if (editing) {
    return (
      <FlowScreen title="Edit win">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Where did you see God's goodness?</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={contentDraft}
                onChangeText={setContentDraft}
                placeholder="Something that went well, or a way God showed up…"
                placeholderTextColor={colors.textSubtle}
                multiline
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
                value={themeDraft}
                onChangeText={setThemeDraft}
                placeholder="e.g. Provision, Healing, Perseverance"
                placeholderTextColor={colors.textSubtle}
                style={styles.singleLineInput}
                accessibilityLabel="Faithfulness theme"
              />
            </View>
          </View>

          <Button
            label="Save changes"
            onPress={handleSave}
            disabled={contentDraft.trim().length === 0 || saving}
            loading={saving}
            style={styles.action}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => setEditing(false)}
            disabled={saving}
            style={styles.action}
          />
        </KeyboardAvoidingView>
      </FlowScreen>
    );
  }

  const metaLine = win.faithfulnessTheme?.trim()
    ? `${formatItemDate(win.createdAt)} · ${win.faithfulnessTheme}`
    : formatItemDate(win.createdAt);

  return (
    <FlowScreen title="Win" subtitle={metaLine}>
      <View style={styles.bodyCard}>
        <Text style={styles.body}>{win.content}</Text>
      </View>
      <Text style={styles.privacyLine}>Private to this device.</Text>

      <Button label="Edit" onPress={startEditing} style={styles.action} />
      <Button
        label="Delete"
        variant="destructive"
        onPress={confirmDelete}
        loading={deleting}
        style={styles.action}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
  },
  bodyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  privacyLine: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
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
  action: {
    marginBottom: spacing.sm,
  },
});
