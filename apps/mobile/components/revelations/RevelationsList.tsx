import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Revelation, RevelationKind, Tag } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { AppearingView } from "@/components/ui/AppearingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import { listRevelations, listTagsForEntries } from "@/lib/db";
import {
  type DateRange,
  EMPTY_RANGE,
  hasActiveFilter,
  isLocalDateInRange,
} from "@/lib/entry-filter";
import { effectiveEntryDate } from "@/lib/entry-grouping";
import { useDebounced } from "@/lib/use-debounced";
import { contentPreview } from "@/lib/gratitude-display";
import { revelationMetaLine } from "@/lib/revelation-display";
import { colors, spacing, typography } from "@/theme/tokens";

const EXPLANATION =
  "Revelations hold what you sense you've received from God — a dream or a prophetic word — kept in your own words.";

/** Only the reflective revelation kinds live here; instructions have their own home. */
type RevelationListKind = Exclude<RevelationKind, "instruction">;
type KindFilter = "all" | RevelationListKind;

const kindOptions: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "dream", label: "Dreams" },
  { value: "prophecy", label: "Prophecies" },
];

type LoadState = "loading" | "ready" | "error";

function filterRevelations(
  revelations: Revelation[],
  tagMap: Map<string, Tag[]>,
  selectedTagId: string | null,
  range: DateRange,
): Revelation[] {
  return revelations.filter((revelation) => {
    if (
      selectedTagId &&
      !(tagMap.get(revelation.id) ?? []).some((tag) => tag.id === selectedTagId)
    ) {
      return false;
    }
    return isLocalDateInRange(effectiveEntryDate(revelation), range);
  });
}

/**
 * Loads tags for a mixed set of revelations. Tags are keyed by the entry's
 * `kind` in the unified tag table, so we group the ids per kind and merge the
 * per-kind tag maps into one.
 */
async function loadTagsByKind(
  revelations: Revelation[],
): Promise<Map<string, Tag[]>> {
  const idsByKind = new Map<RevelationKind, string[]>();
  for (const revelation of revelations) {
    const ids = idsByKind.get(revelation.kind) ?? [];
    ids.push(revelation.id);
    idsByKind.set(revelation.kind, ids);
  }
  const merged = new Map<string, Tag[]>();
  for (const [kind, ids] of idsByKind) {
    const map = await listTagsForEntries(kind, ids);
    for (const [id, tags] of map) {
      merged.set(id, tags);
    }
  }
  return merged;
}

export function RevelationsList() {
  const [revelations, setRevelations] = useState<Revelation[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, Tag[]>>(new Map());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
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

  useFocusEffect(
    useCallback(() => {
      setRefreshTick((tick) => tick + 1);
    }, []),
  );

  useEffect(() => {
    let isActive = true;
    setLoadState((prev) => (prev === "ready" ? prev : "loading"));
    listRevelations({ search: debouncedSearch })
      .then(async (rows) => {
        // Instructions have their own segment now; keep only the reflective
        // kinds (dreams and prophecies) here.
        const reflective = rows.filter((row) => row.kind !== "instruction");
        const map = await loadTagsByKind(reflective);
        if (isActive) {
          setRevelations(reflective);
          setTagMap(map);
          setLoadState("ready");
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadState("error");
        }
        console.warn(
          "Failed to load revelations:",
          error instanceof Error ? error.message : "unknown error",
        );
      });
    return () => {
      isActive = false;
    };
  }, [debouncedSearch, refreshTick]);

  const byKind = useMemo(
    () =>
      kindFilter === "all"
        ? revelations
        : revelations.filter((revelation) => revelation.kind === kindFilter),
    [revelations, kindFilter],
  );

  const filterTags = useMemo(() => collectDistinctTags(tagMap), [tagMap]);

  const visibleActive = useMemo(
    () =>
      filterRevelations(
        byKind.filter((revelation) => revelation.status === "active"),
        tagMap,
        selectedTagId,
        range,
      ),
    [byKind, tagMap, selectedTagId, range],
  );
  const visibleFulfilled = useMemo(
    () =>
      filterRevelations(
        byKind.filter((revelation) => revelation.status === "fulfilled"),
        tagMap,
        selectedTagId,
        range,
      ),
    [byKind, tagMap, selectedTagId, range],
  );

  if (loadState === "loading") {
    return <ListSkeleton />;
  }

  if (loadState === "error") {
    return (
      <Card
        variant="subtle"
        title="Could not load revelations"
        description="Please try again in a moment."
      />
    );
  }

  if (revelations.length === 0 && !filterActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <EmptyState
          icon="compass-outline"
          title="Revelations you save will appear here."
          description="Record a dream or a prophetic word, in your own words."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.explanation}>{EXPLANATION}</Text>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search revelations"
        accessibilityLabel="Search revelations"
      />
      <DateRangeFilter onChange={setRange} />

      <View style={styles.kindFilter}>
        <SegmentedControl
          options={kindOptions}
          value={kindFilter}
          onChange={setKindFilter}
        />
      </View>

      <TagFilterBar
        tags={filterTags}
        selectedId={selectedTagId}
        onSelect={setSelectedTagId}
      />

      {visibleActive.length > 0 ? (
        <Section title="Active" icon="compass-outline">
          {visibleActive.map((revelation, i) => (
            <AppearingView key={revelation.id} index={i}>
              <ItemCard
                meta={revelationMetaLine(revelation)}
                content={revelation.title}
                tags={tagMap.get(revelation.id)}
                accessibilityLabel={`Open revelation: ${revelation.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/revelation/[id]",
                    params: { id: revelation.id },
                  })
                }
              />
            </AppearingView>
          ))}
        </Section>
      ) : null}

      {visibleFulfilled.length > 0 ? (
        <Section title="Fulfilled" icon="checkmark-done-outline">
          {visibleFulfilled.map((revelation, i) => (
            <AppearingView key={revelation.id} index={i}>
              <ItemCard
                meta={revelationMetaLine(revelation)}
                content={contentPreview(revelation.title)}
                tags={tagMap.get(revelation.id)}
                accessibilityLabel={`Open fulfilled revelation: ${revelation.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/revelation/[id]",
                    params: { id: revelation.id },
                  })
                }
              />
            </AppearingView>
          ))}
        </Section>
      ) : null}

      {visibleActive.length === 0 && visibleFulfilled.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          description="Try a different word, widen the date range, or change the kind or tag."
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  explanation: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  kindFilter: {
    marginBottom: spacing.sm,
  },
});
