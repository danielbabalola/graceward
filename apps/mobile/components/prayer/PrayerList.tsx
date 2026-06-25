import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { PrayerRequest, PrayerRequestStatus, Tag } from "@graceward/shared";
import { PrayerRequestCard } from "@/components/prayer/PrayerRequestCard";
import { TagChips } from "@/components/tags/TagChips";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { AppearingView } from "@/components/ui/AppearingView";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { collectDistinctTags } from "@/lib/tag-display";
import { listPrayerRequestsByStatus, listTagsForEntries } from "@/lib/db";
import { spacing } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

const emptyCopy: Record<
  PrayerRequestStatus,
  { icon: "heart-outline" | "checkmark-done-outline" | "archive-outline"; title: string; description: string }
> = {
  active: {
    icon: "heart-outline",
    title: "Nothing here yet",
    description: "Add something you want to bring before God.",
  },
  answered: {
    icon: "checkmark-done-outline",
    title: "No answered prayers yet",
    description:
      "When you mark a request answered, it will gather here as a reminder of God's faithfulness.",
  },
  archived: {
    icon: "archive-outline",
    title: "Nothing archived",
    description: "Requests you archive will rest here for remembrance.",
  },
};

export function PrayerList({ status }: { status: PrayerRequestStatus }) {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, Tag[]>>(new Map());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      // Reset any active tag filter when the status segment changes.
      setSelectedTagId(null);
      listPrayerRequestsByStatus(status)
        .then(async (rows) => {
          const map = await listTagsForEntries(
            "prayer_request",
            rows.map((row) => row.id),
          );
          if (active) {
            setRequests(rows);
            setTagMap(map);
            setLoadState("ready");
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load prayer requests:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        active = false;
      };
    }, [status]),
  );

  const filterTags = useMemo(() => collectDistinctTags(tagMap), [tagMap]);
  const visibleRequests = useMemo(() => {
    if (!selectedTagId) {
      return requests;
    }
    return requests.filter((request) =>
      (tagMap.get(request.id) ?? []).some((tag) => tag.id === selectedTagId),
    );
  }, [requests, tagMap, selectedTagId]);

  if (loadState === "loading") {
    return <ListSkeleton />;
  }

  if (loadState === "error") {
    return (
      <Card
        variant="subtle"
        title="Could not load prayer requests"
        description="Please try again in a moment."
      />
    );
  }

  if (requests.length === 0) {
    const copy = emptyCopy[status];
    return (
      <EmptyState
        icon={copy.icon}
        title={copy.title}
        description={copy.description}
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
      {visibleRequests.map((request, i) => {
        const requestTags = tagMap.get(request.id);
        return (
          <AppearingView key={request.id} index={i} style={styles.cardGroup}>
            <PrayerRequestCard
              request={request}
              onPress={() =>
                router.push({
                  pathname: "/prayer/[id]",
                  params: { id: request.id },
                })
              }
            />
            {requestTags && requestTags.length > 0 ? (
              <TagChips tags={requestTags} />
            ) : null}
          </AppearingView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  cardGroup: {
    gap: spacing.xs,
  },
});
