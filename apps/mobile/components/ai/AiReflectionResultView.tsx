import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AnalyzeReflectionResponse } from "@graceward/ai-schemas";
import { Section } from "@/components/ui/Section";
import { SuggestionCard, type SaveStatus } from "@/components/ai/SuggestionCard";
import { createGratitude, createPrayerRequest, createWin } from "@/lib/db";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

type AiReflectionResultViewProps = {
  journalEntryId: string;
  result: AnalyzeReflectionResponse;
};

/**
 * Renders AI suggestions for review. Nothing here is auto-saved — each card has
 * an explicit save action that writes a local item linked back to the source
 * reflection, and prevents duplicate saves from the same card.
 */
export function AiReflectionResultView({
  journalEntryId,
  result,
}: AiReflectionResultViewProps) {
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});

  async function runSave(key: string, save: () => Promise<unknown>) {
    if (statuses[key] === "saving" || statuses[key] === "saved") {
      return;
    }
    setStatuses((prev) => ({ ...prev, [key]: "saving" }));
    try {
      await save();
      setStatuses((prev) => ({ ...prev, [key]: "saved" }));
    } catch (error: unknown) {
      // Never log raw suggestion content — only an error category.
      console.warn(
        "Failed to save AI suggestion:",
        error instanceof Error ? error.message : "unknown error",
      );
      setStatuses((prev) => ({ ...prev, [key]: "error" }));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.reflectionCard}>
        <Text style={styles.reflectionLabel}>Pastoral reflection</Text>
        <Text style={styles.reflectionBody}>{result.pastoralReflection}</Text>
      </View>

      {result.safetyNote ? (
        <View style={styles.safetyCard}>
          <Text style={styles.safetyLabel}>A gentle note</Text>
          <Text style={styles.safetyBody}>{result.safetyNote}</Text>
        </View>
      ) : null}

      {result.prayerSuggestions.length > 0 ? (
        <Section title="Suggested prayer requests">
          {result.prayerSuggestions.map((prayer, index) => {
            const key = `prayer-${index}`;
            return (
              <SuggestionCard
                key={key}
                title={prayer.title}
                description={prayer.description || undefined}
                status={statuses[key] ?? "idle"}
                saveLabel="Save prayer request"
                savedLabel="Saved to Prayer"
                onSave={() =>
                  void runSave(key, () =>
                    createPrayerRequest({
                      title: prayer.title,
                      description: prayer.description || null,
                      status: "active",
                      sourceJournalEntryId: journalEntryId,
                      syncStatus: "local_only",
                    }),
                  )
                }
              />
            );
          })}
        </Section>
      ) : null}

      {result.gratitudeSuggestions.length > 0 ? (
        <Section title="Suggested gratitudes">
          {result.gratitudeSuggestions.map((gratitude, index) => {
            const key = `gratitude-${index}`;
            return (
              <SuggestionCard
                key={key}
                eyebrow={gratitude.category}
                title={gratitude.content}
                status={statuses[key] ?? "idle"}
                saveLabel="Save gratitude"
                savedLabel="Saved to Gratitude"
                onSave={() =>
                  void runSave(key, () =>
                    createGratitude({
                      content: gratitude.content,
                      category: gratitude.category ?? null,
                      journalEntryId,
                      syncStatus: "local_only",
                    }),
                  )
                }
              />
            );
          })}
        </Section>
      ) : null}

      {result.faithfulnessMomentSuggestions.length > 0 ? (
        <Section title="Suggested faithfulness moments">
          {result.faithfulnessMomentSuggestions.map((moment, index) => {
            const key = `moment-${index}`;
            return (
              <SuggestionCard
                key={key}
                eyebrow={moment.faithfulnessTheme}
                title={moment.content}
                status={statuses[key] ?? "idle"}
                saveLabel="Save faithfulness moment"
                savedLabel="Saved to Faithfulness"
                onSave={() =>
                  void runSave(key, () =>
                    createWin({
                      content: moment.content,
                      faithfulnessTheme: moment.faithfulnessTheme ?? null,
                      journalEntryId,
                      syncStatus: "local_only",
                    }),
                  )
                }
              />
            );
          })}
        </Section>
      ) : null}

      {result.gentleFollowUpQuestions.length > 0 ? (
        <Section title="Gentle questions to sit with">
          <View style={styles.questionsCard}>
            {result.gentleFollowUpQuestions.map((question, index) => (
              <View key={`q-${index}`} style={styles.questionRow}>
                <Text style={styles.questionBullet}>·</Text>
                <Text style={styles.questionText}>{question}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Text style={styles.privacyLine}>
        These are suggestions for you to consider. Nothing was saved unless you
        chose it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  reflectionCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "#C5E4F7",
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  reflectionLabel: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  reflectionBody: {
    ...typography.body,
    color: colors.primaryDeep,
  },
  safetyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.correctionAccent,
    padding: spacing.md,
    gap: spacing.sm,
  },
  safetyLabel: {
    ...typography.caption,
    color: colors.correctionAccent,
    textTransform: "uppercase",
  },
  safetyBody: {
    ...typography.body,
    color: colors.text,
  },
  questionsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  questionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  questionBullet: {
    ...typography.body,
    color: colors.textSubtle,
  },
  questionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  privacyLine: {
    ...typography.bodySmall,
    color: colors.textSubtle,
  },
});
