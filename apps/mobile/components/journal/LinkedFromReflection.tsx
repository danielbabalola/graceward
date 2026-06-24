import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { Gratitude, PrayerRequest, Win } from "@graceward/shared";
import { ItemCard } from "@/components/gratitude/ItemCard";
import {
  listGratitudesByJournalEntryId,
  listPrayerRequestsBySourceJournalEntryId,
  listWinsByJournalEntryId,
} from "@/lib/db";
import { prayerMetaLine } from "@/lib/prayer-display";
import {
  contentPreview,
  gratitudeMetaLine,
  winMetaLine,
} from "@/lib/gratitude-display";
import { colors, spacing, typography } from "@/theme/tokens";

type LinkedFromReflectionProps = {
  journalEntryId: string;
};

/**
 * Shows what the user has carried forward from a reflection: linked prayer
 * requests, gratitudes, and faithfulness moments. Reloads on focus so items
 * created via "Remember from this reflection" appear on return. Renders nothing
 * until loaded and nothing when there are no links, so it can be mounted
 * unconditionally. Fully local; no AI.
 */
export function LinkedFromReflection({
  journalEntryId,
}: LinkedFromReflectionProps) {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [gratitudes, setGratitudes] = useState<Gratitude[]>([]);
  const [moments, setMoments] = useState<Win[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        listPrayerRequestsBySourceJournalEntryId(journalEntryId),
        listGratitudesByJournalEntryId(journalEntryId),
        listWinsByJournalEntryId(journalEntryId),
      ])
        .then(([prayerRows, gratitudeRows, winRows]) => {
          if (active) {
            setPrayers(prayerRows);
            setGratitudes(gratitudeRows);
            setMoments(winRows);
            setLoaded(true);
          }
        })
        .catch((error: unknown) => {
          // Never log raw content — only an error category. Stay quiet in the
          // UI rather than showing an error block for this secondary section.
          console.warn(
            "Failed to load linked items for reflection:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        active = false;
      };
    }, [journalEntryId]),
  );

  const isEmpty =
    prayers.length === 0 && gratitudes.length === 0 && moments.length === 0;

  if (!loaded || isEmpty) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>From this reflection</Text>

      {prayers.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Prayer requests</Text>
          {prayers.map((prayer) => (
            <ItemCard
              key={prayer.id}
              meta={prayerMetaLine(prayer)}
              content={prayer.title}
              accessibilityLabel={`Open prayer request: ${prayer.title}`}
              onPress={() =>
                router.push({
                  pathname: "/prayer/[id]",
                  params: { id: prayer.id },
                })
              }
            />
          ))}
        </View>
      ) : null}

      {gratitudes.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Gratitudes</Text>
          {gratitudes.map((gratitude) => (
            <ItemCard
              key={gratitude.id}
              meta={gratitudeMetaLine(gratitude)}
              content={contentPreview(gratitude.content)}
              accessibilityLabel={`Open gratitude: ${contentPreview(
                gratitude.content,
              )}`}
              onPress={() =>
                router.push({
                  pathname: "/gratitude/[id]",
                  params: { id: gratitude.id },
                })
              }
            />
          ))}
        </View>
      ) : null}

      {moments.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Faithfulness moments</Text>
          {moments.map((moment) => (
            <ItemCard
              key={moment.id}
              meta={winMetaLine(moment)}
              content={contentPreview(moment.content)}
              accentColor={colors.accentGold}
              accessibilityLabel={`Open faithfulness moment: ${contentPreview(
                moment.content,
              )}`}
              onPress={() =>
                router.push({
                  pathname: "/win/[id]",
                  params: { id: moment.id },
                })
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  group: {
    gap: spacing.sm,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
});
