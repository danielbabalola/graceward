import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { PrayerRequest, Tag, Win } from "@graceward/shared";
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
import {
  listWins,
  listPrayerRequestsByStatus,
  listTagsForEntries,
} from "@/lib/db";
import {
  type DateRange,
  EMPTY_RANGE,
  hasActiveFilter,
  isLocalDateInRange,
} from "@/lib/entry-filter";
import { effectiveEntryDate } from "@/lib/entry-grouping";
import { useDebounced } from "@/lib/use-debounced";
import { contentPreview, winMetaLine } from "@/lib/gratitude-display";
import { formatPrayerDate } from "@/lib/prayer-display";
import { colors, spacing, typography } from "@/theme/tokens";

const EXPLANATION =
  "Testimonies gather answered prayers and the major moments of God's faithfulness you want to remember over time.";

type LoadState = "loading" | "ready" | "error";

export function FaithfulnessView() {
  const [wins, setWins] = useState<Win[]>([]);
  const [answered, setAnswered] = useState<PrayerRequest[]>([]);
  const [winTags, setWinTags] = useState<Map<string, Tag[]>>(new Map());
  const [answeredTags, setAnsweredTags] = useState<Map<string, Tag[]>>(
    new Map(),
  );
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
    let active = true;
    setLoadState((prev) => (prev === "ready" ? prev : "loading"));
    const filter = { search: debouncedSearch };
    Promise.all([
      listWins(filter),
      listPrayerRequestsByStatus("answered", filter),
    ])
      .then(async ([winRows, answeredRows]) => {
        const [winMap, answeredMap] = await Promise.all([
          listTagsForEntries(
            "win",
            winRows.map((row) => row.id),
          ),
          listTagsForEntries(
            "prayer_request",
            answeredRows.map((row) => row.id),
          ),
        ]);
        if (active) {
          setWins(winRows);
          setAnswered(answeredRows);
          setWinTags(winMap);
          setAnsweredTags(answeredMap);
          setLoadState("ready");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState("error");
        }
        console.warn(
          "Failed to load faithfulness view:",
          error instanceof Error ? error.message : "unknown error",
        );
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, refreshTick]);

  const filterTags = useMemo(() => {
    const merged = new Map<string, Tag[]>();
    for (const [id, tags] of winTags) {
      merged.set(`w:${id}`, tags);
    }
    for (const [id, tags] of answeredTags) {
      merged.set(`p:${id}`, tags);
    }
    return collectDistinctTags(merged);
  }, [winTags, answeredTags]);

  const visibleWins = useMemo(
    () =>
      wins.filter((win) => {
        if (
          selectedTagId &&
          !(winTags.get(win.id) ?? []).some((tag) => tag.id === selectedTagId)
        ) {
          return false;
        }
        return isLocalDateInRange(effectiveEntryDate(win), range);
      }),
    [wins, winTags, selectedTagId, range],
  );

  const visibleAnswered = useMemo(
    () =>
      answered.filter((request) => {
        if (
          selectedTagId &&
          !(answeredTags.get(request.id) ?? []).some(
            (tag) => tag.id === selectedTagId,
          )
        ) {
          return false;
        }
        // Answered prayers are dated by when they were answered.
        return isLocalDateInRange(
          request.answeredAt ?? request.createdAt,
          range,
        );
      }),
    [answered, answeredTags, selectedTagId, range],
  );

  if (loadState === "loading") {
    return <ListSkeleton />;
  }

  if (loadState === "error") {
    return (
      <Card
        variant="subtle"
        title="Could not load testimonies"
        description="Please try again in a moment."
      />
    );
  }

  if (wins.length === 0 && answered.length === 0 && !filterActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <EmptyState
          icon="sparkles-outline"
          title="Testimonies grow over time"
          description="Answered prayers and major moments of God's faithfulness will appear here over time."
        />
      </View>
    );
  }

  const hasVisible = visibleAnswered.length > 0 || visibleWins.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.explanation}>{EXPLANATION}</Text>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search testimonies"
        accessibilityLabel="Search testimonies"
      />
      <DateRangeFilter onChange={setRange} />
      <TagFilterBar
        tags={filterTags}
        selectedId={selectedTagId}
        onSelect={setSelectedTagId}
      />

      {!hasVisible ? (
        <EmptyState
          icon="search-outline"
          title="No matches"
          description="Try a different word or widen the date range."
        />
      ) : null}

      {visibleAnswered.length > 0 ? (
        <Section title="Answered prayers" icon="checkmark-done-outline">
          {visibleAnswered.map((request, i) => (
            <AppearingView key={request.id} index={i}>
              <ItemCard
                meta={
                  formatPrayerDate(request.answeredAt)
                    ? `Answered · ${formatPrayerDate(request.answeredAt)}`
                    : "Answered"
                }
                content={request.title}
                tags={answeredTags.get(request.id)}
                accentColor={colors.answeredPrayerAccent}
                accessibilityLabel={`Open answered prayer: ${request.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/prayer/[id]",
                    params: { id: request.id },
                  })
                }
              />
            </AppearingView>
          ))}
        </Section>
      ) : null}

      {visibleWins.length > 0 ? (
        <Section title="Testimonies" icon="sparkles-outline">
          {visibleWins.map((win, i) => (
            <AppearingView key={win.id} index={i}>
              <ItemCard
                meta={winMetaLine(win)}
                content={contentPreview(win.content)}
                tags={winTags.get(win.id)}
                accentColor={colors.accentGold}
                accessibilityLabel={`Open testimony: ${contentPreview(
                  win.content,
                )}`}
                onPress={() =>
                  router.push({
                    pathname: "/win/[id]",
                    params: { id: win.id },
                  })
                }
              />
            </AppearingView>
          ))}
        </Section>
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
