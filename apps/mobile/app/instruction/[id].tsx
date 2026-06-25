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
import type { Instruction, Tag } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { DateSelector } from "@/components/ui/DateSelector";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import { TagChips } from "@/components/tags/TagChips";
import { TagEditor } from "@/components/tags/TagEditor";
import {
  fulfillInstruction,
  getInstructionById,
  listTagsForEntry,
  reopenInstruction,
  sameTagNameSet,
  softDeleteInstruction,
  updateInstruction,
} from "@/lib/db";
import {
  instructionIsDue,
  instructionMetaLine,
} from "@/lib/instruction-display";
import { formatEntryDate } from "@/lib/journal-display";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";

export default function InstructionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [editing, setEditing] = useState(false);

  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [dueAtDraft, setDueAtDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useUnsavedChangesGuard(
    editing &&
      !saving &&
      instruction != null &&
      (titleDraft !== instruction.title ||
        contentDraft !== instruction.content ||
        dueAtDraft !== instruction.dueAt ||
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
          const result = await getInstructionById(id);
          if (!active) {
            return;
          }
          if (!result) {
            setLoadState("not-found");
            return;
          }
          setInstruction(result);
          setTags(await listTagsForEntry("instruction", id));
          setLoadState("ready");
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load instruction:",
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
    if (!instruction) {
      return;
    }
    setTitleDraft(instruction.title);
    setContentDraft(instruction.content);
    setTagsDraft(tags.map((tag) => tag.name));
    setDueAtDraft(instruction.dueAt);
    setEditing(true);
  }

  async function handleSave() {
    if (
      !instruction ||
      titleDraft.trim().length === 0 ||
      contentDraft.trim().length === 0 ||
      saving
    ) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateInstruction(instruction.id, {
        title: titleDraft.trim(),
        content: contentDraft.trim(),
        dueAt: dueAtDraft,
        tags: tagsDraft,
      });
      if (updated) {
        setInstruction(updated);
      }
      setTags(await listTagsForEntry("instruction", instruction.id));
      setEditing(false);
    } catch (error: unknown) {
      console.warn(
        "Failed to update instruction:",
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

  async function handleToggleStatus() {
    if (!instruction || updatingStatus) {
      return;
    }
    setUpdatingStatus(true);
    try {
      const updated =
        instruction.status === "active"
          ? await fulfillInstruction(instruction.id)
          : await reopenInstruction(instruction.id);
      if (updated) {
        setInstruction(updated);
      }
    } catch (error: unknown) {
      console.warn(
        "Failed to change instruction status:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not update",
        "This instruction could not be updated just now. Please try again.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  function confirmDelete() {
    if (!instruction) {
      return;
    }
    Alert.alert(
      "Delete this instruction?",
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
    if (!instruction || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await softDeleteInstruction(instruction.id);
      router.replace("/(tabs)/gratitude");
    } catch (error: unknown) {
      console.warn(
        "Failed to delete instruction:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not delete",
        "This instruction could not be removed just now. Please try again.",
      );
      setDeleting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title="Instruction">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title="Instruction">
        <Text style={styles.stateText}>
          This instruction could not be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !instruction) {
    return (
      <FlowScreen title="Instruction">
        <Text style={styles.stateText}>
          This instruction is no longer available.
        </Text>
      </FlowScreen>
    );
  }

  if (editing) {
    return (
      <FlowScreen title="Edit instruction">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.field}>
            <Text style={styles.label}>An instruction I'm holding</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="A short name for this instruction…"
                placeholderTextColor={colors.textSubtle}
                style={styles.singleLineInput}
                accessibilityLabel="Instruction title"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>What I sense I'm being asked to do</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={contentDraft}
                onChangeText={setContentDraft}
                placeholder="In your own words…"
                placeholderTextColor={colors.textSubtle}
                multiline
                textAlignVertical="top"
                style={styles.contentInput}
                accessibilityLabel="Instruction content"
              />
            </View>
          </View>

          <View style={styles.field}>
            <TagEditor
              value={tagsDraft}
              onChange={setTagsDraft}
              placeholder="e.g. Obedience, Generosity, Step of faith"
            />
          </View>

          <DateSelector
            label="By when (optional)"
            value={dueAtDraft}
            onChange={setDueAtDraft}
            disablePast
            allowClear
            emptyLabel="No target date"
            hint="If you sense a timeframe, set a gentle day to aim for. Today or later."
          />

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
      title={instruction.title}
      subtitle={instructionMetaLine(instruction)}
    >
      <View style={styles.bodyCard}>
        <Text style={styles.body}>{instruction.content}</Text>
      </View>

      {instruction.dueAt ? (
        <Text style={styles.dueLine}>
          By when: {formatEntryDate(instruction.dueAt)}
          {instructionIsDue(instruction) ? " · Time to revisit" : ""}
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

      {instruction.sourceJournalEntryId ? (
        <SourceReflectionLink journalEntryId={instruction.sourceJournalEntryId} />
      ) : null}

      <Text style={styles.privacyLine}>Private to this device.</Text>

      <Button label="Edit" onPress={startEditing} style={styles.action} />
      <Button
        label={
          instruction.status === "active" ? "Mark fulfilled" : "Reopen"
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
