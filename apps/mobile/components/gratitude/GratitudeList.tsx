import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Gratitude, Tag } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { AppearingView } from "@/components/ui/AppearingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import { listGratitudes, listTagsForEntries } from "@/lib/db";
import { contentPreview, gratitudeMetaLine } from "@/lib/gratitude-display";
import { spacing } from "@/theme/tokens";

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
    return <ListSkeleton />;
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
      <EmptyState
        icon="bookmark-outline"
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
      {visibleItems.map((item, i) => (
        <AppearingView key={item.id} index={i}>
          <ItemCard
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
        </AppearingView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
});
