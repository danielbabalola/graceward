import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Gratitude, Tag } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { AppearingView } from "@/components/ui/AppearingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import { listGratitudes, listTagsForEntries } from "@/lib/db";
import {
  type DateRange,
  EMPTY_RANGE,
  hasActiveFilter,
  isLocalDateInRange,
} from "@/lib/entry-filter";
import {
  effectiveEntryDate,
  groupEntriesByMonth,
} from "@/lib/entry-grouping";
import { useDebounced } from "@/lib/use-debounced";
import { contentPreview, gratitudeMetaLine } from "@/lib/gratitude-display";
import { colors, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

export function GratitudeList() {
  const [items, setItems] = useState<Gratitude[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, Tag[]>>(new Map());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  const [refreshTick, setRefreshTick] = useState(0);

  const debouncedSearch = useDebounced(search);
  const filterActive = hasActiveFilter({
    search: debouncedSearch,
    startDate: range.startDate,
    endDate: range.endDate,
  });

  // Re-query on focus so newly created gratitudes appear, while keeping any
  // active search/date filter applied.
  useFocusEffect(
    useCallback(() => {
      setRefreshTick((tick) => tick + 1);
    }, []),
  );

  useEffect(() => {
    let active = true;
    setLoadState((prev) => (prev === "ready" ? prev : "loading"));
    listGratitudes({ search: debouncedSearch })
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
  }, [debouncedSearch, refreshTick]);

  const filterTags = useMemo(() => collectDistinctTags(tagMap), [tagMap]);
  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (
          selectedTagId &&
          !(tagMap.get(item.id) ?? []).some((tag) => tag.id === selectedTagId)
        ) {
          return false;
        }
        return isLocalDateInRange(effectiveEntryDate(item), range);
      }),
    [items, tagMap, selectedTagId, range],
  );
  const sections = useMemo(
    () => groupEntriesByMonth(visibleItems),
    [visibleItems],
  );

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

  // Only the truly-empty list (nothing saved yet) hides the controls; once a
  // filter is active we keep them so the user can widen or clear it.
  if (items.length === 0 && !filterActive) {
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
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search gratitude"
        accessibilityLabel="Search gratitude"
      />
      <DateRangeFilter onChange={setRange} />
      <TagFilterBar
        tags={filterTags}
        selectedId={selectedTagId}
        onSelect={setSelectedTagId}
      />

      {visibleItems.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          description="Try a different word or widen the date range."
        />
      ) : (
        sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.monthHeader}>{section.title}</Text>
            {section.items.map((item, i) => (
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
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  monthHeader: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
});
