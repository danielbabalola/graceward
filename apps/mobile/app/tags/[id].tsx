import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { Tag } from "@graceward/shared";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { Card } from "@/components/ui/Card";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { getTagById } from "@/lib/db";
import {
  ENTRY_ROUTES,
  listTaggedEntriesForTag,
  type TaggedEntryListItem,
} from "@/lib/tagged-entries";
import { formatItemDate } from "@/lib/gratitude-display";
import { colors, spacing } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";

export default function TagDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tag, setTag] = useState<Tag | null>(null);
  const [items, setItems] = useState<TaggedEntryListItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!id) {
        setLoadState("not-found");
        return;
      }
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));

      void (async () => {
        try {
          const loadedTag = await getTagById(id);
          if (!active) {
            return;
          }
          if (!loadedTag) {
            setLoadState("not-found");
            return;
          }
          const loadedItems = await listTaggedEntriesForTag(id);
          if (!active) {
            return;
          }
          setTag(loadedTag);
          setItems(loadedItems);
          setLoadState("ready");
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load tag:",
            error instanceof Error ? error.message : "unknown error",
          );
        }
      })();

      return () => {
        active = false;
      };
    }, [id]),
  );

  const title = tag ? tag.name : "Tag";
  const subtitle =
    loadState === "ready"
      ? `${items.length} ${items.length === 1 ? "entry" : "entries"}`
      : undefined;

  return (
    <FlowScreen title={title} subtitle={subtitle}>
      {loadState === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      ) : null}

      {loadState === "error" ? (
        <Card
          variant="subtle"
          title="Could not load this tag"
          description="Please try again in a moment."
        />
      ) : null}

      {loadState === "not-found" ? (
        <Text style={styles.stateText}>This tag is no longer available.</Text>
      ) : null}

      {loadState === "ready" && items.length === 0 ? (
        <Card
          variant="subtle"
          title="Nothing here yet"
          description="Entries you tag with this will gather here."
        />
      ) : null}

      {loadState === "ready" && items.length > 0 ? (
        <View style={styles.list}>
          {items.map((item) => (
            <ItemCard
              key={`${item.entryType}:${item.entryId}`}
              meta={`${item.typeLabel} · ${formatItemDate(item.createdAt)}`}
              content={item.label}
              accessibilityLabel={`Open ${item.typeLabel}: ${item.label}`}
              onPress={() =>
                router.push({
                  pathname: ENTRY_ROUTES[item.entryType] as never,
                  params: { id: item.entryId },
                })
              }
            />
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
  stateText: {
    color: colors.textMuted,
  },
  list: {
    gap: spacing.sm,
  },
});
