import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { JournalEntry, Tag } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { TagChips } from "@/components/tags/TagChips";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import { listJournalEntries, listTagsForEntries } from "@/lib/db";
import { colors, spacing } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

export function JournalTimeline() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, Tag[]>>(new Map());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      listJournalEntries()
        .then(async (rows) => {
          const map = await listTagsForEntries(
            "journal_entry",
            rows.map((row) => row.id),
          );
          if (active) {
            setEntries(rows);
            setTagMap(map);
            setLoadState("ready");
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load journal entries:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const filterTags = useMemo(() => collectDistinctTags(tagMap), [tagMap]);
  const visibleEntries = useMemo(() => {
    if (!selectedTagId) {
      return entries;
    }
    return entries.filter((entry) =>
      (tagMap.get(entry.id) ?? []).some((tag) => tag.id === selectedTagId),
    );
  }, [entries, tagMap, selectedTagId]);

  if (loadState === "loading") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primaryDeep} />
      </View>
    );
  }

  if (loadState === "error") {
    return (
      <Card
        variant="subtle"
        title="Could not load your journal"
        description="Please try again in a moment."
      />
    );
  }

  if (entries.length === 0) {
    return (
      <Card
        variant="subtle"
        title="Start with one honest reflection"
        description="You do not need perfect words."
      />
    );
  }

  return (
    <View style={styles.list}>
      <TagFilterBar
        tags={filterTags}
        selectedId={selectedTagId}
        onSelect={setSelectedTagId}
      />
      {visibleEntries.map((entry) => {
        const entryTags = tagMap.get(entry.id);
        return (
          <View key={entry.id} style={styles.cardGroup}>
            <JournalEntryCard
              entry={entry}
              onPress={() =>
                router.push({
                  pathname: "/journal/[id]",
                  params: { id: entry.id },
                })
              }
            />
            {entryTags && entryTags.length > 0 ? (
              <TagChips tags={entryTags} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  list: {
    gap: spacing.sm,
  },
  cardGroup: {
    gap: spacing.xs,
  },
});
