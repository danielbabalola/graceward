import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Instruction, Tag } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { TagFilterBar } from "@/components/tags/TagFilterBar";
import { collectDistinctTags } from "@/lib/tag-display";
import { listInstructionsByStatus, listTagsForEntries } from "@/lib/db";
import { contentPreview } from "@/lib/gratitude-display";
import { instructionMetaLine } from "@/lib/instruction-display";
import { colors, spacing, typography } from "@/theme/tokens";

const EXPLANATION =
  "Instructions hold what you believe God has asked you to do — recorded in your own words, and kept until you've acted on it.";

type LoadState = "loading" | "ready" | "error";

function filterByTag(
  instructions: Instruction[],
  tagMap: Map<string, Tag[]>,
  selectedTagId: string | null,
): Instruction[] {
  if (!selectedTagId) {
    return instructions;
  }
  return instructions.filter((instruction) =>
    (tagMap.get(instruction.id) ?? []).some((tag) => tag.id === selectedTagId),
  );
}

export function InstructionsList() {
  const [active, setActive] = useState<Instruction[]>([]);
  const [fulfilled, setFulfilled] = useState<Instruction[]>([]);
  const [tagMap, setTagMap] = useState<Map<string, Tag[]>>(new Map());
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      Promise.all([
        listInstructionsByStatus("active"),
        listInstructionsByStatus("fulfilled"),
      ])
        .then(async ([activeRows, fulfilledRows]) => {
          const map = await listTagsForEntries(
            "instruction",
            [...activeRows, ...fulfilledRows].map((row) => row.id),
          );
          if (isActive) {
            setActive(activeRows);
            setFulfilled(fulfilledRows);
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
    () => filterByTag(active, tagMap, selectedTagId),
    [active, tagMap, selectedTagId],
  );
  const visibleFulfilled = useMemo(
    () => filterByTag(fulfilled, tagMap, selectedTagId),
    [fulfilled, tagMap, selectedTagId],
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
        title="Could not load instructions"
        description="Please try again in a moment."
      />
    );
  }

  if (active.length === 0 && fulfilled.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <Card
          variant="subtle"
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
        <Section title="What I'm being asked">
          {visibleActive.map((instruction) => (
            <ItemCard
              key={instruction.id}
              meta={instructionMetaLine(instruction)}
              content={instruction.title}
              tags={tagMap.get(instruction.id)}
              accessibilityLabel={`Open instruction: ${instruction.title}`}
              onPress={() =>
                router.push({
                  pathname: "/instruction/[id]",
                  params: { id: instruction.id },
                })
              }
            />
          ))}
        </Section>
      ) : null}

      {visibleFulfilled.length > 0 ? (
        <Section title="Fulfilled">
          {visibleFulfilled.map((instruction) => (
            <ItemCard
              key={instruction.id}
              meta={instructionMetaLine(instruction)}
              content={contentPreview(instruction.title)}
              tags={tagMap.get(instruction.id)}
              accessibilityLabel={`Open fulfilled instruction: ${instruction.title}`}
              onPress={() =>
                router.push({
                  pathname: "/instruction/[id]",
                  params: { id: instruction.id },
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
