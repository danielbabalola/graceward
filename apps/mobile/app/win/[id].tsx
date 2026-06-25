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
import type { Tag, Win } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import { TagChips } from "@/components/tags/TagChips";
import { TagEditor } from "@/components/tags/TagEditor";
import {
  getWinById,
  listTagsForEntry,
  sameTagNameSet,
  softDeleteWin,
  updateWin,
} from "@/lib/db";
import { formatItemDate } from "@/lib/gratitude-display";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";

export default function WinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [win, setWin] = useState<Win | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [editing, setEditing] = useState(false);

  const [contentDraft, setContentDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useUnsavedChangesGuard(
    editing &&
      !saving &&
      win != null &&
      (contentDraft !== win.content ||
        !sameTagNameSet(tagsDraft, tags.map((tag) => tag.name))),
  );

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
          setTags(await listTagsForEntry("win", id));
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
    setTagsDraft(tags.map((tag) => tag.name));
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
        tags: tagsDraft,
      });
      if (updated) {
        setWin(updated);
      }
      setTags(await listTagsForEntry("win", win.id));
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
    Alert.alert(
      "Delete this testimony?",
      "It will be removed from your device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDelete();
          },
        },
      ],
    );
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
        "This testimony could not be removed just now. Please try again.",
      );
      setDeleting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title="Testimony">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title="Testimony">
        <Text style={styles.stateText}>
          This testimony could not be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !win) {
    return (
      <FlowScreen title="Testimony">
        <Text style={styles.stateText}>
          This testimony is no longer available.
        </Text>
      </FlowScreen>
    );
  }

  if (editing) {
    return (
      <FlowScreen title="Edit testimony">
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
                accessibilityLabel="Testimony"
              />
            </View>
          </View>

          <View style={styles.field}>
            <TagEditor
              value={tagsDraft}
              onChange={setTagsDraft}
              placeholder="e.g. Provision, Healing, Perseverance"
            />
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

  return (
    <FlowScreen
      title="Testimony"
      subtitle={formatItemDate(win.createdAt)}
    >
      <View style={styles.bodyCard}>
        <Text style={styles.body}>{win.content}</Text>
      </View>

      {tags.length > 0 ? (
        <View style={styles.tagsBlock}>
          <TagChips
            tags={tags}
            onPressTag={(tag) =>
              router.push({ pathname: "/tags/[id]", params: { id: tag.id } })
            }
          />
        </View>
      ) : null}

      {win.journalEntryId ? (
        <SourceReflectionLink journalEntryId={win.journalEntryId} />
      ) : null}

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
  tagsBlock: {
    marginBottom: spacing.md,
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
  action: {
    marginBottom: spacing.sm,
  },
});
