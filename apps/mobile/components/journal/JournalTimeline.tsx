import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { JournalEntry } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { listJournalEntries } from "@/lib/db";
import { colors, spacing } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

export function JournalTimeline() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      listJournalEntries()
        .then((rows) => {
          if (active) {
            setEntries(rows);
            setLoadState("ready");
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load journal entries:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        active = false;
      };
    }, []),
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
        title="Could not load your journal"
        description="Please try again in a moment."
      />
    );
  }

  if (entries.length === 0) {
    return (
      <Card
        variant="subtle"
        title="Start with one honest reflection"
        description="You do not need perfect words."
      />
    );
  }

  return (
    <View style={styles.list}>
      {entries.map((entry) => (
        <JournalEntryCard
          key={entry.id}
          entry={entry}
          onPress={() =>
            router.push({
              pathname: "/journal/[id]",
              params: { id: entry.id },
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
