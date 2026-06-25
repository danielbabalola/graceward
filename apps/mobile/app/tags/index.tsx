import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { TagWithCount } from "@graceward/shared";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { Card } from "@/components/ui/Card";
import { listTagsWithCounts } from "@/lib/db";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

export default function TagsIndexScreen() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      listTagsWithCounts()
        .then((rows) => {
          if (active) {
            // Only surface tags that are actually applied somewhere.
            setTags(rows.filter((tag) => tag.count > 0));
            setLoadState("ready");
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load tags:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <FlowScreen
      title="Tags"
      subtitle="One vocabulary across everything you've saved."
    >
      {loadState === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      ) : null}

      {loadState === "error" ? (
        <Card
          variant="subtle"
          title="Could not load tags"
          description="Please try again in a moment."
        />
      ) : null}

      {loadState === "ready" && tags.length === 0 ? (
        <Card
          variant="subtle"
          title="No tags yet"
          description="Add a tag to a gratitude, prayer, lesson, testimony, or reflection, and it will gather here."
        />
      ) : null}

      {loadState === "ready" && tags.length > 0 ? (
        <View style={styles.list}>
          {tags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() =>
                router.push({ pathname: "/tags/[id]", params: { id: tag.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open tag ${tag.name}, ${tag.count} ${
                tag.count === 1 ? "entry" : "entries"
              }`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.name}>{tag.name}</Text>
              <Text style={styles.count}>{tag.count}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </FlowScreen>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
  },
  name: {
    ...typography.cardTitle,
    color: colors.text,
    flex: 1,
  },
  count: {
    ...typography.body,
    color: colors.textSubtle,
    marginLeft: spacing.md,
  },
});
