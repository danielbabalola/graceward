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
import type { Revelation, Tag } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { DateSelector } from "@/components/ui/DateSelector";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import { PolishWithAi } from "@/components/entry/PolishWithAi";
import { TagChips } from "@/components/tags/TagChips";
import { TagEditor } from "@/components/tags/TagEditor";
import {
  fulfillRevelation,
  getRevelationById,
  listTagsForEntry,
  reopenRevelation,
  sameTagNameSet,
  softDeleteRevelation,
  toLocalDateString,
  updateRevelation,
} from "@/lib/db";
import { safeFollowUpDate } from "@/lib/voice-entry-fields";
import {
  revelationFulfilledLabel,
  revelationIsDue,
  revelationKindLabel,
  revelationMetaLine,
} from "@/lib/revelation-display";
import { formatEntryDate } from "@/lib/journal-display";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";

export default function RevelationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [revelation, setRevelation] = useState<Revelation | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [editing, setEditing] = useState(false);

  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [dueAtDraft, setDueAtDraft] = useState<string | null>(null);
  const [occurredAtDraft, setOccurredAtDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const kindLabel = revelation ? revelationKindLabel(revelation.kind) : "Revelation";
  const isInstruction = revelation?.kind === "instruction";

  useUnsavedChangesGuard(
    editing &&
      !saving &&
      revelation != null &&
      (titleDraft !== revelation.title ||
        contentDraft !== revelation.content ||
        dueAtDraft !== revelation.dueAt ||
        occurredAtDraft !== revelation.occurredAt ||
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
          const result = await getRevelationById(id);
          if (!active) {
            return;
          }
          if (!result) {
            setLoadState("not-found");
            return;
          }
          setRevelation(result);
          setTags(await listTagsForEntry(result.kind, id));
          setLoadState("ready");
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load revelation:",
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
    if (!revelation) {
      return;
    }
    setTitleDraft(revelation.title);
    setContentDraft(revelation.content);
    setTagsDraft(tags.map((tag) => tag.name));
    setDueAtDraft(revelation.dueAt);
    setOccurredAtDraft(revelation.occurredAt);
    setEditing(true);
  }

  async function handleSave() {
    if (
      !revelation ||
      titleDraft.trim().length === 0 ||
      contentDraft.trim().length === 0 ||
      saving
    ) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateRevelation(revelation.id, {
        title: titleDraft.trim(),
        content: contentDraft.trim(),
        dueAt: isInstruction ? dueAtDraft : null,
        occurredAt: isInstruction ? undefined : occurredAtDraft,
        tags: tagsDraft,
      });
      if (updated) {
        setRevelation(updated);
      }
      setTags(await listTagsForEntry(revelation.kind, revelation.id));
      setEditing(false);
    } catch (error: unknown) {
      console.warn(
        "Failed to update revelation:",
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

  function handleToggleStatus() {
    if (!revelation || updatingStatus) {
      return;
    }
    const word = revelationFulfilledLabel(revelation.kind).toLowerCase();
    // Confirm before marking done (the consequential direction); reopening is
    // restorative, so it happens immediately.
    if (revelation.status === "active") {
      Alert.alert(
        `Mark this ${word}?`,
        "It will move out of your active list. You can reopen it any time.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: () => void performToggleStatus() },
        ],
      );
      return;
    }
    void performToggleStatus();
  }

  async function performToggleStatus() {
    if (!revelation || updatingStatus) {
      return;
    }
    setUpdatingStatus(true);
    try {
      const updated =
        revelation.status === "active"
          ? await fulfillRevelation(revelation.id)
          : await reopenRevelation(revelation.id);
      if (updated) {
        setRevelation(updated);
      }
    } catch (error: unknown) {
      console.warn(
        "Failed to change revelation status:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not update",
        "This could not be updated just now. Please try again.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  function confirmDelete() {
    if (!revelation) {
      return;
    }
    Alert.alert("Delete this?", "It will be removed from your device.", [
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
    if (!revelation || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await softDeleteRevelation(revelation.id);
      router.replace({
        pathname: "/(tabs)/gratitude",
        params: {
          segment: revelation.kind === "instruction" ? "instructions" : "revelations",
        },
      });
    } catch (error: unknown) {
      console.warn(
        "Failed to delete revelation:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not delete",
        "This could not be removed just now. Please try again.",
      );
      setDeleting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title={kindLabel}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title={kindLabel}>
        <Text style={styles.stateText}>
          This could not be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !revelation) {
    return (
      <FlowScreen title={kindLabel}>
        <Text style={styles.stateText}>This is no longer available.</Text>
      </FlowScreen>
    );
  }

  if (editing) {
    return (
      <FlowScreen title={`Edit ${kindLabel.toLowerCase()}`}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <PolishWithAi
            entryType={revelation.kind}
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
            onApplyDate={
              isInstruction
                ? (date) => setDueAtDraft(safeFollowUpDate(date))
                : undefined
            }
            getCurrentValues={() => ({
              title: titleDraft,
              content: contentDraft,
              tags: tagsDraft,
              date: dueAtDraft,
            })}
            titleNoun="name"
            contentNoun={
              revelation.kind === "dream"
                ? "dream"
                : revelation.kind === "prophecy"
                  ? "word"
                  : "details"
            }
            dateNoun="by-when date"
          />

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="A short name…"
                placeholderTextColor={colors.textSubtle}
                style={styles.singleLineInput}
                accessibilityLabel={`${kindLabel} title`}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Details</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={contentDraft}
                onChangeText={setContentDraft}
                placeholder="In your own words…"
                placeholderTextColor={colors.textSubtle}
                multiline
                textAlignVertical="top"
                style={styles.contentInput}
                accessibilityLabel={`${kindLabel} content`}
              />
            </View>
          </View>

          <View style={styles.field}>
            <TagEditor
              value={tagsDraft}
              onChange={setTagsDraft}
              placeholder="e.g. Guidance, Trust, Calling"
            />
          </View>

          {!isInstruction ? (
            <DateSelector
              label={
                revelation.kind === "dream"
                  ? "When you had this dream (optional)"
                  : "When you received this word (optional)"
              }
              value={occurredAtDraft}
              onChange={setOccurredAtDraft}
              maxDate={toLocalDateString(new Date())}
              allowClear
              emptyLabel="No date"
              hint="The day it came to you. Today or a past day."
            />
          ) : null}

          {isInstruction ? (
            <DateSelector
              label="By when (optional)"
              value={dueAtDraft}
              onChange={setDueAtDraft}
              disablePast
              allowClear
              emptyLabel="No target date"
              hint="If you sense a timeframe, set a gentle day to aim for. Today or later."
            />
          ) : null}

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
    <FlowScreen
      title={revelation.title}
      subtitle={revelationMetaLine(revelation)}
    >
      <View style={styles.bodyCard}>
        <Text style={styles.body}>{revelation.content}</Text>
      </View>

      {isInstruction && revelation.dueAt ? (
        <Text style={styles.dueLine}>
          By when: {formatEntryDate(revelation.dueAt)}
          {revelationIsDue(revelation) ? " · Time to revisit" : ""}
        </Text>
      ) : null}

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

      {revelation.sourceJournalEntryId ? (
        <SourceReflectionLink journalEntryId={revelation.sourceJournalEntryId} />
      ) : null}

      <Text style={styles.privacyLine}>Private to this device.</Text>

      <Button label="Edit" onPress={startEditing} style={styles.action} />
      <Button
        label={
          revelation.status === "active"
            ? `Mark ${revelationFulfilledLabel(revelation.kind).toLowerCase()}`
            : "Reopen"
        }
        variant="secondary"
        onPress={handleToggleStatus}
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
  dueLine: {
    ...typography.bodySmall,
    color: colors.primaryDeep,
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
