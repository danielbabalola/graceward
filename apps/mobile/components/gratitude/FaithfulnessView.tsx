import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { PrayerRequest, Win } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { listRecentWins, listPrayerRequestsByStatus } from "@/lib/db";
import { contentPreview, winMetaLine } from "@/lib/gratitude-display";
import { formatPrayerDate } from "@/lib/prayer-display";
import { colors, spacing, typography } from "@/theme/tokens";

const EXPLANATION =
  "Faithfulness gathers answered prayers and moments you want to remember over time.";

type LoadState = "loading" | "ready" | "error";

export function FaithfulnessView() {
  const [wins, setWins] = useState<Win[]>([]);
  const [answered, setAnswered] = useState<PrayerRequest[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      Promise.all([
        listRecentWins(10),
        listPrayerRequestsByStatus("answered"),
      ])
        .then(([winRows, answeredRows]) => {
          if (active) {
            setWins(winRows);
            setAnswered(answeredRows);
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
        title="Could not load faithfulness"
        description="Please try again in a moment."
      />
    );
  }

  if (wins.length === 0 && answered.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <Card
          variant="subtle"
          title="Faithfulness grows over time"
          description="Answered prayers and moments of God's goodness will appear here over time."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.explanation}>{EXPLANATION}</Text>

      {answered.length > 0 ? (
        <Section title="Answered prayers">
          {answered.map((request) => (
            <ItemCard
              key={request.id}
              meta={
                formatPrayerDate(request.answeredAt)
                  ? `Answered · ${formatPrayerDate(request.answeredAt)}`
                  : "Answered"
              }
              content={request.title}
              accentColor={colors.answeredPrayerAccent}
              accessibilityLabel={`Open answered prayer: ${request.title}`}
              onPress={() =>
                router.push({
                  pathname: "/prayer/[id]",
                  params: { id: request.id },
                })
              }
            />
          ))}
        </Section>
      ) : null}

      {wins.length > 0 ? (
        <Section title="Faithfulness moments">
          {wins.map((win) => (
            <ItemCard
              key={win.id}
              meta={winMetaLine(win)}
              content={contentPreview(win.content)}
              accentColor={colors.accentGold}
              accessibilityLabel={`Open faithfulness moment: ${contentPreview(
                win.content,
              )}`}
              onPress={() =>
                router.push({
                  pathname: "/win/[id]",
                  params: { id: win.id },
                })
              }
            />
          ))}
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  container: {
    gap: spacing.sm,
  },
  explanation: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
});
