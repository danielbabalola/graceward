import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Lesson } from "@graceward/shared";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { listLessonsByStatus } from "@/lib/db";
import { contentPreview } from "@/lib/gratitude-display";
import { lessonMetaLine } from "@/lib/lesson-display";
import { colors, spacing, typography } from "@/theme/tokens";

const EXPLANATION =
  "Lessons hold what you're learning or noticing with God — something He may be forming in you over time.";

type LoadState = "loading" | "ready" | "error";

export function LessonsList() {
  const [active, setActive] = useState<Lesson[]>([]);
  const [archived, setArchived] = useState<Lesson[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      Promise.all([
        listLessonsByStatus("active"),
        listLessonsByStatus("archived"),
      ])
        .then(([activeRows, archivedRows]) => {
          if (isActive) {
            setActive(activeRows);
            setArchived(archivedRows);
            setLoadState("ready");
          }
        })
        .catch((error: unknown) => {
          if (isActive) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load lessons:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        isActive = false;
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
        title="Could not load lessons"
        description="Please try again in a moment."
      />
    );
  }

  if (active.length === 0 && archived.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.explanation}>{EXPLANATION}</Text>
        <Card
          variant="subtle"
          title="Lessons you save will appear here."
          description="Notice what God may be forming in you over time."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.explanation}>{EXPLANATION}</Text>

      {active.length > 0 ? (
        <Section title="What I'm learning">
          {active.map((lesson) => (
            <ItemCard
              key={lesson.id}
              meta={lessonMetaLine(lesson)}
              content={lesson.title}
              accessibilityLabel={`Open lesson: ${lesson.title}`}
              onPress={() =>
                router.push({
                  pathname: "/lesson/[id]",
                  params: { id: lesson.id },
                })
              }
            />
          ))}
        </Section>
      ) : null}

      {archived.length > 0 ? (
        <Section title="Archived">
          {archived.map((lesson) => (
            <ItemCard
              key={lesson.id}
              meta={lessonMetaLine(lesson)}
              content={contentPreview(lesson.title)}
              accessibilityLabel={`Open archived lesson: ${lesson.title}`}
              onPress={() =>
                router.push({
                  pathname: "/lesson/[id]",
                  params: { id: lesson.id },
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
