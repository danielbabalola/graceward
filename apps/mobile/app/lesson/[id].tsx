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
import type { Lesson, Tag } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import { PolishWithAi } from "@/components/entry/PolishWithAi";
import { TagChips } from "@/components/tags/TagChips";
import { TagEditor } from "@/components/tags/TagEditor";
import {
  archiveLesson,
  getLessonById,
  listTagsForEntry,
  reactivateLesson,
  sameTagNameSet,
  softDeleteLesson,
  toLocalDateString,
  updateLesson,
} from "@/lib/db";
import { lessonMetaLine } from "@/lib/lesson-display";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [editing, setEditing] = useState(false);

  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useUnsavedChangesGuard(
    editing &&
      !saving &&
      lesson != null &&
      (titleDraft !== lesson.title ||
        contentDraft !== lesson.content ||
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
          const result = await getLessonById(id);
          if (!active) {
            return;
          }
          if (!result) {
            setLoadState("not-found");
            return;
          }
          setLesson(result);
          setTags(await listTagsForEntry("lesson", id));
          setLoadState("ready");
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load lesson:",
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
    if (!lesson) {
      return;
    }
    setTitleDraft(lesson.title);
    setContentDraft(lesson.content);
    setTagsDraft(tags.map((tag) => tag.name));
    setEditing(true);
  }

  async function handleSave() {
    if (
      !lesson ||
      titleDraft.trim().length === 0 ||
      contentDraft.trim().length === 0 ||
      saving
    ) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateLesson(lesson.id, {
        title: titleDraft.trim(),
        content: contentDraft.trim(),
        tags: tagsDraft,
      });
      if (updated) {
        setLesson(updated);
      }
      setTags(await listTagsForEntry("lesson", lesson.id));
      setEditing(false);
    } catch (error: unknown) {
      console.warn(
        "Failed to update lesson:",
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

  function handleToggleArchive() {
    if (!lesson || updatingStatus) {
      return;
    }
    // Confirm before archiving (the consequential direction); moving back to
    // active is restorative, so it happens immediately.
    if (lesson.status === "active") {
      Alert.alert(
        "Archive this lesson?",
        "It will move to Archived and out of your active list. You can move it back any time.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", onPress: () => void performToggleArchive() },
        ],
      );
      return;
    }
    void performToggleArchive();
  }

  async function performToggleArchive() {
    if (!lesson || updatingStatus) {
      return;
    }
    setUpdatingStatus(true);
    try {
      const updated =
        lesson.status === "active"
          ? await archiveLesson(lesson.id)
          : await reactivateLesson(lesson.id);
      if (updated) {
        setLesson(updated);
      }
    } catch (error: unknown) {
      console.warn(
        "Failed to change lesson status:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not update",
        "This lesson could not be updated just now. Please try again.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  function confirmDelete() {
    if (!lesson) {
      return;
    }
    Alert.alert("Delete this lesson?", "It will be removed from your device.", [
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
    if (!lesson || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await softDeleteLesson(lesson.id);
      router.replace({
        pathname: "/(tabs)/gratitude",
        params: { segment: "lessons" },
      });
    } catch (error: unknown) {
      console.warn(
        "Failed to delete lesson:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not delete",
        "This lesson could not be removed just now. Please try again.",
      );
      setDeleting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title="Lesson">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title="Lesson">
        <Text style={styles.stateText}>
          This lesson could not be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !lesson) {
    return (
      <FlowScreen title="Lesson">
        <Text style={styles.stateText}>This lesson is no longer available.</Text>
      </FlowScreen>
    );
  }

  if (editing) {
    return (
      <FlowScreen title="Edit lesson">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <PolishWithAi
            entryType="lesson"
            entryDate={toLocalDateString(new Date())}
            getText={() =>
              [titleDraft, contentDraft]
                .filter((value) => value.trim().length > 0)
                .join("\n\n")
            }
            disabled={saving}
            onApplyTitle={setTitleDraft}
            onApplyContent={setContentDraft}
            onApplyTags={setTagsDraft}
            getCurrentValues={() => ({
              title: titleDraft,
              content: contentDraft,
              tags: tagsDraft,
            })}
            titleNoun="title"
            contentNoun="what you're learning"
          />

          <View style={styles.field}>
            <Text style={styles.label}>A lesson I'm noticing</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="A short name for this lesson…"
                placeholderTextColor={colors.textSubtle}
                style={styles.singleLineInput}
                accessibilityLabel="Lesson title"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>What I'm learning</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={contentDraft}
                onChangeText={setContentDraft}
                placeholder="In your own words…"
                placeholderTextColor={colors.textSubtle}
                multiline
                textAlignVertical="top"
                style={styles.contentInput}
                accessibilityLabel="Lesson content"
              />
            </View>
          </View>

          <View style={styles.field}>
            <TagEditor
              value={tagsDraft}
              onChange={setTagsDraft}
              placeholder="e.g. Trust, Patience, Surrender"
            />
          </View>

          <Button
            label="Save changes"
            onPress={handleSave}
            disabled={
              titleDraft.trim().length === 0 ||
              contentDraft.trim().length === 0 ||
              saving
            }
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
    <FlowScreen title={lesson.title} subtitle={lessonMetaLine(lesson)}>
      <View style={styles.bodyCard}>
        <Text style={styles.body}>{lesson.content}</Text>
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

      {lesson.sourceJournalEntryId ? (
        <SourceReflectionLink journalEntryId={lesson.sourceJournalEntryId} />
      ) : null}

      <Text style={styles.privacyLine}>Private to this device.</Text>

      <Button label="Edit" onPress={startEditing} style={styles.action} />
      <Button
        label={lesson.status === "active" ? "Archive" : "Move to active"}
        variant="secondary"
        onPress={handleToggleArchive}
        loading={updatingStatus}
        style={styles.action}
      />
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
  singleLineInput: {
    ...typography.body,
    color: colors.text,
  },
  action: {
    marginBottom: spacing.sm,
  },
});
