import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Lesson, Tag } from "@graceward/shared";
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
import { listLessonsByStatus, listTagsForEntries } from "@/lib/db";
import {
  type DateRange,
  EMPTY_RANGE,
  hasActiveFilter,
  isLocalDateInRange,
} from "@/lib/entry-filter";
import { effectiveEntryDate } from "@/lib/entry-grouping";
import { useDebounced } from "@/lib/use-debounced";
import { contentPreview } from "@/lib/gratitude-display";
import { lessonMetaLine } from "@/lib/lesson-display";
import { colors, spacing, typography } from "@/theme/tokens";

const EXPLANATION =
  "Lessons hold what you're learning or noticing with God — something He may be forming in you over time.";

type LoadState = "loading" | "ready" | "error";

function filterLessons(
  lessons: Lesson[],
  tagMap: Map<string, Tag[]>,
  selectedTagId: string | null,
  range: DateRange,
): Lesson[] {
  return lessons.filter((lesson) => {
    if (
      selectedTagId &&
      !(tagMap.get(lesson.id) ?? []).some((tag) => tag.id === selectedTagId)
    ) {
      return false;
    }
    return isLocalDateInRange(effectiveEntryDate(lesson), range);
  });
}

export function LessonsList() {
  const [active, setActive] = useState<Lesson[]>([]);
  const [archived, setArchived] = useState<Lesson[]>([]);
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
    const filter = { search: debouncedSearch };
    Promise.all([
      listLessonsByStatus("active", filter),
      listLessonsByStatus("archived", filter),
    ])
      .then(async ([activeRows, archivedRows]) => {
        const map = await listTagsForEntries(
          "lesson",
          [...activeRows, ...archivedRows].map((row) => row.id),
        );
        if (isActive) {
          setActive(activeRows);
          setArchived(archivedRows);
          setTagMap(map);
          setLoadState("ready");
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadState("error");
        }
        console.warn(
          "Failed to load lessons:",
          error instanceof Error ? error.message : "unknown error",
        );
      });
    return () => {
      isActive = false;
    };
  }, [debouncedSearch, refreshTick]);

  const filterTags = useMemo(() => collectDistinctTags(tagMap), [tagMap]);
  const visibleActive = useMemo(
    () => filterLessons(active, tagMap, selectedTagId, range),
    [active, tagMap, selectedTagId, range],
  );
  const visibleArchived = useMemo(
    () => filterLessons(archived, tagMap, selectedTagId, range),
    [archived, tagMap, selectedTagId, range],
  );

  if (loadState === "loading") {
    return <ListSkeleton />;
  }

  if (loadState === "error") {
    return (
      <Card
        variant="subtle"
        title="Could not load lessons"
        description="Please try again in a moment."
      />
    );
  }

  // Truly empty (nothing saved yet) hides the controls; an active filter keeps
  // them visible so the user can adjust it.
  if (active.length === 0 && archived.length === 0 && !filterActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <EmptyState
          icon="school-outline"
          title="Lessons you save will appear here."
          description="Notice what God may be forming in you over time."
        />
      </View>
    );
  }

  const hasVisible = visibleActive.length > 0 || visibleArchived.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.explanation}>{EXPLANATION}</Text>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search lessons"
        accessibilityLabel="Search lessons"
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

      {visibleActive.length > 0 ? (
        <Section title="What I'm learning" icon="school-outline">
          {visibleActive.map((lesson, i) => (
            <AppearingView key={lesson.id} index={i}>
              <ItemCard
                meta={lessonMetaLine(lesson)}
                content={lesson.title}
                tags={tagMap.get(lesson.id)}
                accessibilityLabel={`Open lesson: ${lesson.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/lesson/[id]",
                    params: { id: lesson.id },
                  })
                }
              />
            </AppearingView>
          ))}
        </Section>
      ) : null}

      {visibleArchived.length > 0 ? (
        <Section title="Archived" icon="archive-outline">
          {visibleArchived.map((lesson, i) => (
            <AppearingView key={lesson.id} index={i}>
              <ItemCard
                meta={lessonMetaLine(lesson)}
                content={contentPreview(lesson.title)}
                tags={tagMap.get(lesson.id)}
                accessibilityLabel={`Open archived lesson: ${lesson.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/lesson/[id]",
                    params: { id: lesson.id },
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
