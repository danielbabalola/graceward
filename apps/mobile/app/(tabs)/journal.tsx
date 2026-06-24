import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import type { JournalEntry } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { listJournalEntries } from "@/lib/db";
import { colors, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

export default function JournalScreen() {
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

  return (
    <Screen
      title="Journal"
      subtitle="Your reflections over time, kept private and close."
    >
      {loadState === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      ) : loadState === "error" ? (
        <Card
          variant="subtle"
          title="Could not load your journal"
          description="Please try again in a moment."
        />
      ) : entries.length === 0 ? (
        <Card
          variant="subtle"
          title="Start with one honest reflection"
          description="You do not need perfect words."
        />
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <JournalEntryCard key={entry.id} entry={entry} />
          ))}
        </View>
      )}

      <Text style={styles.footnote}>Calendar view is coming soon.</Text>
    </Screen>
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
  footnote: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
