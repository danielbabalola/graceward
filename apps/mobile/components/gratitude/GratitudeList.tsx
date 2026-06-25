import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Gratitude, Tag } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import { listGratitudes, listTagsForEntries } from "@/lib/db";
import { contentPreview, gratitudeMetaLine } from "@/lib/gratitude-display";
import { colors, spacing } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

export function GratitudeList() {
  const [items, setItems] = useState<Gratitude[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, Tag[]>>(new Map());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      listGratitudes()
        .then(async (rows) => {
          const map = await listTagsForEntries(
            "gratitude",
            rows.map((row) => row.id),
          );
          if (active) {
            setItems(rows);
            setTagMap(map);
            setLoadState("ready");
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load gratitudes:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const filterTags = useMemo(() => collectDistinctTags(tagMap), [tagMap]);
  const visibleItems = useMemo(() => {
    if (!selectedTagId) {
      return items;
    }
    return items.filter((item) =>
      (tagMap.get(item.id) ?? []).some((tag) => tag.id === selectedTagId),
    );
  }, [items, tagMap, selectedTagId]);

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
        title="Could not load gratitudes"
        description="Please try again in a moment."
      />
    );
  }

  if (items.length === 0) {
    return (
      <Card
        variant="subtle"
        title="Notice one mercy from today"
        description="Name something specific you're thankful for, no matter how small."
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
      {visibleItems.map((item) => (
        <ItemCard
          key={item.id}
          meta={gratitudeMetaLine(item)}
          content={contentPreview(item.content)}
          tags={tagMap.get(item.id)}
          accessibilityLabel={`Open gratitude: ${contentPreview(item.content)}`}
          onPress={() =>
            router.push({
              pathname: "/gratitude/[id]",
              params: { id: item.id },
            })
          }
        />
      ))}
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
});
