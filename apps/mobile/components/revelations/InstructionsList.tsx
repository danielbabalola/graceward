import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Revelation, Tag } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { DateRangeFilter } from "@/components/ui/DateRangeFilter";
import { AppearingView } from "@/components/ui/AppearingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import { listRevelationsByKind, listTagsForEntries } from "@/lib/db";
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
  "Instructions hold what you sense God is asking you to do — kept humbly, in your own words. Add a gentle 'by when' if you sense a timeframe, and mark one fulfilled once you've acted on it.";

type LoadState = "loading" | "ready" | "error";

function filterInstructions(
  instructions: Revelation[],
  tagMap: Map<string, Tag[]>,
  selectedTagId: string | null,
  range: DateRange,
): Revelation[] {
  return instructions.filter((instruction) => {
    if (
      selectedTagId &&
      !(tagMap.get(instruction.id) ?? []).some(
        (tag) => tag.id === selectedTagId,
      )
    ) {
      return false;
    }
    return isLocalDateInRange(effectiveEntryDate(instruction), range);
  });
}

export function InstructionsList() {
  const [instructions, setInstructions] = useState<Revelation[]>([]);
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

  useFocusEffect(
    useCallback(() => {
      setRefreshTick((tick) => tick + 1);
    }, []),
  );

  useEffect(() => {
    let isActive = true;
    setLoadState((prev) => (prev === "ready" ? prev : "loading"));
    listRevelationsByKind("instruction", { search: debouncedSearch })
      .then(async (rows) => {
        const map = await listTagsForEntries(
          "instruction",
          rows.map((row) => row.id),
        );
        if (isActive) {
          setInstructions(rows);
          setTagMap(map);
          setLoadState("ready");
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadState("error");
        }
        console.warn(
          "Failed to load instructions:",
          error instanceof Error ? error.message : "unknown error",
        );
      });
    return () => {
      isActive = false;
    };
  }, [debouncedSearch, refreshTick]);

  const filterTags = useMemo(() => collectDistinctTags(tagMap), [tagMap]);

  const visibleActive = useMemo(
    () =>
      filterInstructions(
        instructions.filter((instruction) => instruction.status === "active"),
        tagMap,
        selectedTagId,
        range,
      ),
    [instructions, tagMap, selectedTagId, range],
  );
  const visibleFulfilled = useMemo(
    () =>
      filterInstructions(
        instructions.filter(
          (instruction) => instruction.status === "fulfilled",
        ),
        tagMap,
        selectedTagId,
        range,
      ),
    [instructions, tagMap, selectedTagId, range],
  );

  if (loadState === "loading") {
    return <ListSkeleton />;
  }

  if (loadState === "error") {
    return (
      <Card
        variant="subtle"
        title="Could not load instructions"
        description="Please try again in a moment."
      />
    );
  }

  if (instructions.length === 0 && !filterActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <EmptyState
          icon="compass-outline"
          title="Instructions you save will appear here."
          description="Record what you sense God is asking of you, in your own words."
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
        placeholder="Search instructions"
        accessibilityLabel="Search instructions"
      />
      <DateRangeFilter onChange={setRange} />

      <TagFilterBar
        tags={filterTags}
        selectedId={selectedTagId}
        onSelect={setSelectedTagId}
      />

      {visibleActive.length > 0 ? (
        <Section title="Active" icon="compass-outline">
          {visibleActive.map((instruction, i) => (
            <AppearingView key={instruction.id} index={i}>
              <ItemCard
                meta={revelationMetaLine(instruction, false)}
                content={instruction.title}
                tags={tagMap.get(instruction.id)}
                accessibilityLabel={`Open instruction: ${instruction.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/revelation/[id]",
                    params: { id: instruction.id },
                  })
                }
              />
            </AppearingView>
          ))}
        </Section>
      ) : null}

      {visibleFulfilled.length > 0 ? (
        <Section title="Fulfilled" icon="checkmark-done-outline">
          {visibleFulfilled.map((instruction, i) => (
            <AppearingView key={instruction.id} index={i}>
              <ItemCard
                meta={revelationMetaLine(instruction, false)}
                content={contentPreview(instruction.title)}
                tags={tagMap.get(instruction.id)}
                accessibilityLabel={`Open fulfilled instruction: ${instruction.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/revelation/[id]",
                    params: { id: instruction.id },
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
          description="Try a different word, widen the date range, or change the tag."
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
});
