import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Revelation, Tag } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { AppearingView } from "@/components/ui/AppearingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import { listRevelationsByKind, listTagsForEntries } from "@/lib/db";
import { contentPreview } from "@/lib/gratitude-display";
import { revelationMetaLine } from "@/lib/revelation-display";
import { colors, spacing, typography } from "@/theme/tokens";

const EXPLANATION =
  "Instructions hold what you sense God is asking you to do — kept humbly, in your own words. Add a gentle 'by when' if you sense a timeframe, and mark one fulfilled once you've acted on it.";

type LoadState = "loading" | "ready" | "error";

function filterByTag(
  instructions: Revelation[],
  tagMap: Map<string, Tag[]>,
  selectedTagId: string | null,
): Revelation[] {
  if (!selectedTagId) {
    return instructions;
  }
  return instructions.filter((instruction) =>
    (tagMap.get(instruction.id) ?? []).some((tag) => tag.id === selectedTagId),
  );
}

export function InstructionsList() {
  const [instructions, setInstructions] = useState<Revelation[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, Tag[]>>(new Map());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      listRevelationsByKind("instruction")
        .then(async (rows) => {
          const map = await listTagsForEntries(
            "instruction",
            rows.map((row) => row.id),
          );
          if (isActive) {
            setInstructions(rows);
            setTagMap(map);
            setLoadState("ready");
          }
        })
        .catch((error: unknown) => {
          if (isActive) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load instructions:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        isActive = false;
      };
    }, []),
  );

  const filterTags = useMemo(() => collectDistinctTags(tagMap), [tagMap]);

  const visibleActive = useMemo(
    () =>
      filterByTag(
        instructions.filter((instruction) => instruction.status === "active"),
        tagMap,
        selectedTagId,
      ),
    [instructions, tagMap, selectedTagId],
  );
  const visibleFulfilled = useMemo(
    () =>
      filterByTag(
        instructions.filter(
          (instruction) => instruction.status === "fulfilled",
        ),
        tagMap,
        selectedTagId,
      ),
    [instructions, tagMap, selectedTagId],
  );

  if (loadState === "loading") {
    return <ListSkeleton />;
  }

  if (loadState === "error") {
    return (
      <Card
        variant="subtle"
        title="Could not load instructions"
        description="Please try again in a moment."
      />
    );
  }

  if (instructions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <EmptyState
          icon="compass-outline"
          title="Instructions you save will appear here."
          description="Record what you sense God is asking of you, in your own words."
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

      {visibleActive.length > 0 ? (
        <Section title="Active" icon="compass-outline">
          {visibleActive.map((instruction, i) => (
            <AppearingView key={instruction.id} index={i}>
              <ItemCard
                meta={revelationMetaLine(instruction, false)}
                content={instruction.title}
                tags={tagMap.get(instruction.id)}
                accessibilityLabel={`Open instruction: ${instruction.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/revelation/[id]",
                    params: { id: instruction.id },
                  })
                }
              />
            </AppearingView>
          ))}
        </Section>
      ) : null}

      {visibleFulfilled.length > 0 ? (
        <Section title="Fulfilled" icon="checkmark-done-outline">
          {visibleFulfilled.map((instruction, i) => (
            <AppearingView key={instruction.id} index={i}>
              <ItemCard
                meta={revelationMetaLine(instruction, false)}
                content={contentPreview(instruction.title)}
                tags={tagMap.get(instruction.id)}
                accessibilityLabel={`Open fulfilled instruction: ${instruction.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/revelation/[id]",
                    params: { id: instruction.id },
                  })
                }
              />
            </AppearingView>
          ))}
        </Section>
      ) : null}

      {visibleActive.length === 0 && visibleFulfilled.length === 0 ? (
        <EmptyState
          icon="compass-outline"
          title="Nothing here yet."
          description="Nothing matches this filter. Try another tag."
        />
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
