import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { PrayerRequest, PrayerRequestStatus } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { PrayerRequestCard } from "@/components/prayer/PrayerRequestCard";
import { listPrayerRequestsByStatus } from "@/lib/db";
import { colors, spacing } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

const emptyCopy: Record<
  PrayerRequestStatus,
  { title: string; description: string }
> = {
  active: {
    title: "Nothing here yet",
    description: "Add something you want to bring before God.",
  },
  answered: {
    title: "No answered prayers yet",
    description:
      "When you mark a request answered, it will gather here as a reminder of God's faithfulness.",
  },
  archived: {
    title: "Nothing archived",
    description: "Requests you archive will rest here for remembrance.",
  },
};

export function PrayerList({ status }: { status: PrayerRequestStatus }) {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      listPrayerRequestsByStatus(status)
        .then((rows) => {
          if (active) {
            setRequests(rows);
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
        title="Could not load prayer requests"
        description="Please try again in a moment."
      />
    );
  }

  if (requests.length === 0) {
    const copy = emptyCopy[status];
    return (
      <Card variant="subtle" title={copy.title} description={copy.description} />
    );
  }

  return (
    <View style={styles.list}>
      {requests.map((request) => (
        <PrayerRequestCard
          key={request.id}
          request={request}
          onPress={() =>
            router.push({
              pathname: "/prayer/[id]",
              params: { id: request.id },
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
