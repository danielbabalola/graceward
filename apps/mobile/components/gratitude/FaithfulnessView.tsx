import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { PrayerRequest, Tag, Win } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { AppearingView } from "@/components/ui/AppearingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import {
  listRecentWins,
  listPrayerRequestsByStatus,
  listTagsForEntries,
} from "@/lib/db";
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      Promise.all([
        listRecentWins(10),
        listPrayerRequestsByStatus("answered"),
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
    }, []),
  );

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

  const visibleWins = useMemo(() => {
    if (!selectedTagId) {
      return wins;
    }
    return wins.filter((win) =>
      (winTags.get(win.id) ?? []).some((tag) => tag.id === selectedTagId),
    );
  }, [wins, winTags, selectedTagId]);

  const visibleAnswered = useMemo(() => {
    if (!selectedTagId) {
      return answered;
    }
    return answered.filter((request) =>
      (answeredTags.get(request.id) ?? []).some(
        (tag) => tag.id === selectedTagId,
      ),
    );
  }, [answered, answeredTags, selectedTagId]);

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

  if (wins.length === 0 && answered.length === 0) {
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

  return (
    <View style={styles.container}>
      <Text style={styles.explanation}>{EXPLANATION}</Text>

      <TagFilterBar
        tags={filterTags}
        selectedId={selectedTagId}
        onSelect={setSelectedTagId}
      />

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
