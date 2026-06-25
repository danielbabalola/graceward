import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Tag, TaggableEntryType } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { TagChips } from "@/components/tags/TagChips";
import { TagEditor } from "@/components/tags/TagEditor";
import { listTagsForEntry, setEntryTags } from "@/lib/db";
import { colors, spacing, typography } from "@/theme/tokens";

type EntryTagsSectionProps = {
  entryType: TaggableEntryType;
  entryId: string;
  onPressTag?: (tag: Tag) => void;
};

/**
 * Self-contained tag editor for screens that don't already thread a tag draft
 * through their own edit mode (e.g. the journal reflection detail, which has
 * several render branches). Loads its own tags, shows them as chips, and offers
 * an inline edit/save flow.
 */
export function EntryTagsSection({
  entryType,
  entryId,
  onPressTag,
}: EntryTagsSectionProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      setTags(await listTagsForEntry(entryType, entryId));
    } catch (error: unknown) {
      console.warn(
        "Failed to load tags:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }, [entryType, entryId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const loaded = await listTagsForEntry(entryType, entryId);
          if (active) {
            setTags(loaded);
          }
        } catch (error: unknown) {
          console.warn(
            "Failed to load tags:",
            error instanceof Error ? error.message : "unknown error",
          );
        }
      })();
      return () => {
        active = false;
      };
    }, [entryType, entryId]),
  );

  function beginEdit() {
    setDraft(tags.map((tag) => tag.name));
    setEditing(true);
  }

  async function handleSave() {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await setEntryTags(entryType, entryId, draft);
      await reload();
      setEditing(false);
    } catch (error: unknown) {
      console.warn(
        "Failed to save tags:",
        error instanceof Error ? error.message : "unknown error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <View style={styles.container}>
        <TagEditor value={draft} onChange={setDraft} label="Tags" />
        <View style={styles.actions}>
          <Button
            label="Save tags"
            onPress={handleSave}
            loading={saving}
            style={styles.actionFlex}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => setEditing(false)}
            disabled={saving}
            style={styles.actionFlex}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Tags</Text>
        <Pressable
          onPress={beginEdit}
          accessibilityRole="button"
          accessibilityLabel={tags.length > 0 ? "Edit tags" : "Add tags"}
        >
          <Text style={styles.editLink}>
            {tags.length > 0 ? "Edit" : "Add tags"}
          </Text>
        </Pressable>
      </View>
      {tags.length > 0 ? (
        <TagChips tags={tags} onPressTag={onPressTag} />
      ) : (
        <Text style={styles.empty}>No tags yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  editLink: {
    ...typography.bodySmall,
    color: colors.primaryDeep,
    fontWeight: "600",
  },
  empty: {
    ...typography.bodySmall,
    color: colors.textSubtle,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionFlex: {
    flex: 1,
  },
});
