import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import type {
  Gratitude,
  Instruction,
  JournalEntry,
  Lesson,
  PrayerRequest,
  Win,
} from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ItemCard } from "@/components/gratitude/ItemCard";
import { Screen } from "@/components/ui/Screen";
import { Section } from "@/components/ui/Section";
import {
  getInstructionFocus,
  getMostRecentAnsweredPrayer,
  getMostRecentGratitude,
  getMostRecentJournalEntry,
  getMostRecentLesson,
  getMostRecentWin,
  getPrayerFocus,
} from "@/lib/db";
import {
  entryMetaLine,
  journalBodyPreview,
} from "@/lib/journal-display";
import { formatPrayerDate, prayerMetaLine } from "@/lib/prayer-display";
import {
  contentPreview,
  gratitudeMetaLine,
  winMetaLine,
} from "@/lib/gratitude-display";
import { lessonMetaLine } from "@/lib/lesson-display";
import { instructionMetaLine } from "@/lib/instruction-display";
import { APP_TAGLINE } from "@/lib/diagnostics";
import {
  colors,
  radii,
  shadows,
  spacing,
  touchTarget,
  typography,
} from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error";

type TodayData = {
  recentJournal: JournalEntry | null;
  prayerFocus: PrayerRequest | null;
  recentGratitude: Gratitude | null;
  answeredPrayer: PrayerRequest | null;
  recentWin: Win | null;
  recentLesson: Lesson | null;
  recentInstruction: Instruction | null;
};

const EMPTY_DATA: TodayData = {
  recentJournal: null,
  prayerFocus: null,
  recentGratitude: null,
  answeredPrayer: null,
  recentWin: null,
  recentLesson: null,
  recentInstruction: null,
};

type FaithfulnessReminder =
  | { kind: "answered"; prayer: PrayerRequest }
  | { kind: "moment"; win: Win }
  | null;

/**
 * Picks the single faithfulness item to remember. When both an answered prayer
 * and a faithfulness moment exist, the more recent one wins; ties fall back to
 * the answered prayer.
 */
function selectFaithfulnessReminder(
  answered: PrayerRequest | null,
  win: Win | null,
): FaithfulnessReminder {
  if (answered && win) {
    const answeredAt = answered.answeredAt ?? answered.createdAt;
    return win.createdAt > answeredAt
      ? { kind: "moment", win }
      : { kind: "answered", prayer: answered };
  }
  if (answered) {
    return { kind: "answered", prayer: answered };
  }
  if (win) {
    return { kind: "moment", win };
  }
  return null;
}

export default function TodayScreen() {
  const [data, setData] = useState<TodayData>(EMPTY_DATA);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));
      Promise.all([
        getMostRecentJournalEntry(),
        getPrayerFocus(),
        getMostRecentGratitude(),
        getMostRecentAnsweredPrayer(),
        getMostRecentWin(),
        getMostRecentLesson(),
        getInstructionFocus(),
      ])
        .then(
          ([
            recentJournal,
            prayerFocus,
            recentGratitude,
            answeredPrayer,
            recentWin,
            recentLesson,
            recentInstruction,
          ]) => {
            if (active) {
              setData({
                recentJournal,
                prayerFocus,
                recentGratitude,
                answeredPrayer,
                recentWin,
                recentLesson,
                recentInstruction,
              });
              setLoadState("ready");
            }
          },
        )
        .catch((error: unknown) => {
          if (active) {
            setLoadState("error");
          }
          // Never log raw entry content — only an error category.
          console.warn(
            "Failed to load Today dashboard:",
            error instanceof Error ? error.message : "unknown error",
          );
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const reminder = selectFaithfulnessReminder(
    data.answeredPrayer,
    data.recentWin,
  );

  return (
    <Screen title="Today">
      <TodayHero />

      {loadState === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      ) : null}

      {loadState === "error" ? (
        <Card
          variant="subtle"
          title="Could not load Today"
          description="Please try again in a moment."
        />
      ) : null}

      {loadState === "ready" ? (
        <>
          <Section title="Recent reflection">
            {data.recentJournal ? (
              <RecentReflectionCard entry={data.recentJournal} />
            ) : (
              <Card
                variant="subtle"
                title="Begin with one honest reflection"
                description="When you reflect, your most recent entry will rest here."
              />
            )}
          </Section>

          <Section title="Today's focus">
            {data.prayerFocus ? (
              <ItemCard
                meta={prayerMetaLine(data.prayerFocus)}
                content={data.prayerFocus.title}
                accessibilityLabel={`Open prayer focus: ${data.prayerFocus.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/prayer/[id]",
                    params: { id: data.prayerFocus!.id },
                  })
                }
              />
            ) : (
              <View style={styles.emptyBlock}>
                <Card
                  variant="subtle"
                  title="Today's Prayer Focus"
                  description="Add something you'd like to bring before God."
                />
                <Button
                  label="Add prayer request"
                  variant="secondary"
                  onPress={() => router.push("/prayer/new")}
                />
              </View>
            )}

            {data.recentGratitude ? (
              <ItemCard
                meta={gratitudeMetaLine(data.recentGratitude)}
                content={contentPreview(data.recentGratitude.content)}
                accessibilityLabel={`Open gratitude: ${contentPreview(
                  data.recentGratitude.content,
                )}`}
                onPress={() =>
                  router.push({
                    pathname: "/gratitude/[id]",
                    params: { id: data.recentGratitude!.id },
                  })
                }
              />
            ) : (
              <View style={styles.emptyBlock}>
                <Card
                  variant="subtle"
                  title="Recent Gratitude"
                  description="Notice one mercy from today, no matter how small."
                />
                <Button
                  label="Add gratitude"
                  variant="secondary"
                  onPress={() => router.push("/gratitude/new")}
                />
              </View>
            )}
          </Section>

          <Section title="Testimonies">
            {reminder ? (
              <FaithfulnessReminderCard reminder={reminder} />
            ) : (
              <View style={styles.emptyBlock}>
                <Card
                  variant="subtle"
                  title="Remembering God's faithfulness"
                  description="Answered prayers and major moments of God's faithfulness will appear here over time."
                />
                <Button
                  label="Add testimony"
                  variant="secondary"
                  onPress={() => router.push("/win/new")}
                />
              </View>
            )}
          </Section>

          {data.recentLesson ? (
            <Section title="What I'm Learning">
              <ItemCard
                meta={lessonMetaLine(data.recentLesson)}
                content={data.recentLesson.title}
                accentColor={colors.primaryDeep}
                accessibilityLabel={`Open lesson: ${data.recentLesson.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/lesson/[id]",
                    params: { id: data.recentLesson!.id },
                  })
                }
              />
            </Section>
          ) : null}

          {data.recentInstruction ? (
            <Section title="What I'm Being Asked">
              <ItemCard
                meta={instructionMetaLine(data.recentInstruction)}
                content={data.recentInstruction.title}
                accentColor={colors.primaryDeep}
                accessibilityLabel={`Open instruction: ${data.recentInstruction.title}`}
                onPress={() =>
                  router.push({
                    pathname: "/instruction/[id]",
                    params: { id: data.recentInstruction!.id },
                  })
                }
              />
            </Section>
          ) : null}
        </>
      ) : null}

      <Section title="Review">
        <Card
          eyebrow="Coming later"
          variant="subtle"
          title="Weekly Review"
          description="As you reflect over time, weekly reviews will gather recurring themes, lessons, and answered prayers here."
        />
      </Section>
    </Screen>
  );
}

/**
 * A small set of calm, open-ended prompts. One is chosen per calendar day so
 * the hero feels alive without changing on every focus. Phrased as gentle
 * invitations, never as commands or as the app speaking for God.
 */
const DAILY_PROMPTS = [
  "What is one honest thing about today?",
  "Where did you notice God today?",
  "What do you need to bring before Him?",
  "Name one mercy from today, however small.",
  "What is sitting on your heart right now?",
  "What are you hoping for tonight?",
] as const;

/** Picks a stable prompt for the current local day. */
function dailyPrompt(now: Date = new Date()): string {
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return DAILY_PROMPTS[
    ((dayIndex % DAILY_PROMPTS.length) + DAILY_PROMPTS.length) %
      DAILY_PROMPTS.length
  ]!;
}

/**
 * The Today home hero: a calm, dawn/sanctuary-inspired arch that anchors the
 * screen as the main place to pause, with the app tagline, a gentle daily
 * prompt, and the primary "Begin Reflection" action.
 */
function TodayHero() {
  return (
    <View style={styles.hero}>
      <View style={styles.heroSun} />
      <View style={styles.heroArch}>
        <Text style={styles.heroEyebrow}>A moment with God</Text>
        <Text style={styles.heroTagline}>{APP_TAGLINE}</Text>
        <Text style={styles.heroPrompt}>{dailyPrompt()}</Text>
        <Pressable
          onPress={() => router.push("/reflection")}
          accessibilityRole="button"
          accessibilityLabel="Begin a new reflection"
          style={({ pressed }) => [styles.heroCta, pressed && styles.heroCtaPressed]}
        >
          <Text style={styles.heroCtaLabel}>Begin Reflection</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RecentReflectionCard({ entry }: { entry: JournalEntry }) {
  const body = journalBodyPreview(entry);
  const trimmedTitle = entry.title?.trim();
  const title = trimmedTitle || (body ? "Untitled reflection" : "Voice reflection");
  const description =
    body && body !== title
      ? body
      : body
        ? undefined
        : "A voice reflection saved privately on this device.";

  return (
    <Card
      eyebrow={entryMetaLine(entry)}
      title={title}
      description={description}
      onPress={() =>
        router.push({ pathname: "/journal/[id]", params: { id: entry.id } })
      }
    />
  );
}

function FaithfulnessReminderCard({
  reminder,
}: {
  reminder: NonNullable<FaithfulnessReminder>;
}) {
  if (reminder.kind === "answered") {
    const { prayer } = reminder;
    const answeredDate = formatPrayerDate(prayer.answeredAt);
    return (
      <ItemCard
        meta={answeredDate ? `Answered prayer · ${answeredDate}` : "Answered prayer"}
        content={prayer.title}
        accentColor={colors.answeredPrayerAccent}
        accessibilityLabel={`Open answered prayer: ${prayer.title}`}
        onPress={() =>
          router.push({ pathname: "/prayer/[id]", params: { id: prayer.id } })
        }
      />
    );
  }

  const { win } = reminder;
  return (
    <ItemCard
      meta={`Testimony · ${winMetaLine(win)}`}
      content={contentPreview(win.content)}
      accentColor={colors.accentGold}
      accessibilityLabel={`Open testimony: ${contentPreview(
        win.content,
      )}`}
      onPress={() =>
        router.push({ pathname: "/win/[id]", params: { id: win.id } })
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyBlock: {
    gap: spacing.sm,
  },
  hero: {
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  // Soft dawn "sun" rising behind the arch.
  heroSun: {
    position: "absolute",
    top: -56,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.accentGold,
    opacity: 0.18,
  },
  // The sanctuary arch: a rounded-top panel holding the focal content.
  heroArch: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  heroEyebrow: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  heroTagline: {
    ...typography.sectionTitle,
    color: colors.primaryDeep,
    textAlign: "center",
  },
  heroPrompt: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  heroCta: {
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: touchTarget,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCtaPressed: {
    opacity: 0.9,
  },
  heroCtaLabel: {
    ...typography.cardTitle,
    color: colors.white,
  },
});
