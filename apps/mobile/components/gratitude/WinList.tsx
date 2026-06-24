import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Win } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { listWins } from "@/lib/db";
import { contentPreview, winMetaLine } from "@/lib/gratitude-display";
import { colors, spacing } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

export function WinList() {
  const [items, setItems] = useState<Win[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      listWins()
        .then((rows) => {
          if (active) {
            setItems(rows);
            setLoadState("ready");
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load wins:",
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
        title="Could not load wins"
        description="Please try again in a moment."
      />
    );
  }

  if (items.length === 0) {
    return (
      <Card
        variant="subtle"
        title="Notice a sign of God's goodness"
        description="A win is anywhere you saw God at work — not a measure of your performance."
      />
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          meta={winMetaLine(item)}
          content={contentPreview(item.content)}
          accentColor={colors.accentGold}
          accessibilityLabel={`Open win: ${contentPreview(item.content)}`}
          onPress={() =>
            router.push({
              pathname: "/win/[id]",
              params: { id: item.id },
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
