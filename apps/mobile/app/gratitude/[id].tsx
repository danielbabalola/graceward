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
import type { Gratitude, Tag } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import { PolishWithAi } from "@/components/entry/PolishWithAi";
import { TagChips } from "@/components/tags/TagChips";
import { TagEditor } from "@/components/tags/TagEditor";
import {
  getGratitudeById,
  listTagsForEntry,
  sameTagNameSet,
  softDeleteGratitude,
  toLocalDateString,
  updateGratitude,
} from "@/lib/db";
import { formatItemDate } from "@/lib/gratitude-display";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";

export default function GratitudeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [gratitude, setGratitude] = useState<Gratitude | null>(null);
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
      gratitude != null &&
      (contentDraft !== gratitude.content ||
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
          const result = await getGratitudeById(id);
          if (!active) {
            return;
          }
          if (!result) {
            setLoadState("not-found");
            return;
          }
          setGratitude(result);
          setTags(await listTagsForEntry("gratitude", id));
          setLoadState("ready");
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load gratitude:",
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
    if (!gratitude) {
      return;
    }
    setContentDraft(gratitude.content);
    setTagsDraft(tags.map((tag) => tag.name));
    setEditing(true);
  }

  async function handleSave() {
    if (!gratitude || contentDraft.trim().length === 0 || saving) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateGratitude(gratitude.id, {
        content: contentDraft.trim(),
        tags: tagsDraft,
      });
      if (updated) {
        setGratitude(updated);
      }
      setTags(await listTagsForEntry("gratitude", gratitude.id));
      setEditing(false);
    } catch (error: unknown) {
      console.warn(
        "Failed to update gratitude:",
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
    if (!gratitude) {
      return;
    }
    Alert.alert(
      "Delete this gratitude?",
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
    if (!gratitude || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await softDeleteGratitude(gratitude.id);
      router.replace({
        pathname: "/(tabs)/gratitude",
        params: { segment: "gratitude" },
      });
    } catch (error: unknown) {
      console.warn(
        "Failed to delete gratitude:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not delete",
        "This gratitude could not be removed just now. Please try again.",
      );
      setDeleting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title="Gratitude">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title="Gratitude">
        <Text style={styles.stateText}>
          This gratitude could not be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !gratitude) {
    return (
      <FlowScreen title="Gratitude">
        <Text style={styles.stateText}>
          This gratitude is no longer available.
        </Text>
      </FlowScreen>
    );
  }

  if (editing) {
    return (
      <FlowScreen title="Edit gratitude">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <PolishWithAi
            entryType="gratitude"
            entryDate={toLocalDateString(new Date())}
            getText={() => contentDraft}
            disabled={saving}
            onApplyContent={setContentDraft}
            onApplyTags={setTagsDraft}
            getCurrentValues={() => ({
              content: contentDraft,
              tags: tagsDraft,
            })}
            contentNoun="gratitude"
          />

          <View style={styles.field}>
            <Text style={styles.label}>What are you grateful for?</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={contentDraft}
                onChangeText={setContentDraft}
                placeholder="A specific mercy, gift, or kindness…"
                placeholderTextColor={colors.textSubtle}
                multiline
                textAlignVertical="top"
                style={styles.contentInput}
                accessibilityLabel="Gratitude content"
              />
            </View>
          </View>

          <View style={styles.field}>
            <TagEditor
              value={tagsDraft}
              onChange={setTagsDraft}
              placeholder="e.g. Family, Provision, Health"
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
      title="Gratitude"
      subtitle={formatItemDate(gratitude.createdAt)}
    >
      <View style={styles.bodyCard}>
        <Text style={styles.body}>{gratitude.content}</Text>
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

      {gratitude.journalEntryId ? (
        <SourceReflectionLink journalEntryId={gratitude.journalEntryId} />
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
