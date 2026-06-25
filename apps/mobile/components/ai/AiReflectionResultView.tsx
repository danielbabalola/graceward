import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AnalyzeReflectionResponse } from "@graceward/ai-schemas";
import { Section } from "@/components/ui/Section";
import { SuggestionCard, type SaveStatus } from "@/components/ai/SuggestionCard";
import {
  createGratitude,
  createLesson,
  createPrayerRequest,
  createRevelation,
  createWin,
  faithfulnessSuggestionFingerprint,
  gratitudeSuggestionFingerprint,
  instructionSuggestionFingerprint,
  lessonSuggestionFingerprint,
  listSavedSuggestionFingerprints,
  markAiSuggestionSaved,
  prayerSuggestionFingerprint,
  type CreatedItemType,
  type SuggestionKind,
} from "@/lib/db";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

type AiReflectionResultViewProps = {
  journalEntryId: string;
  /** The cached AI result row id; saved suggestions are linked to it. */
  aiReflectionResultId: string;
  result: AnalyzeReflectionResponse;
};

type SaveMeta = {
  kind: SuggestionKind;
  index: number;
  fingerprint: string;
  createdItemType: CreatedItemType;
};

/** Splits the reflection into trimmed paragraphs for calm, readable spacing. */
function toParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Renders AI suggestions for review. Nothing here is auto-saved — each card has
 * an explicit save action that writes a local item linked back to the source
 * reflection, and prevents duplicate saves from the same card.
 */
export function AiReflectionResultView({
  journalEntryId,
  aiReflectionResultId,
  result,
}: AiReflectionResultViewProps) {
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});

  // Restore saved state when reopening: mark any card whose suggestion was
  // already saved (matched by content fingerprint) as "saved".
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = new Set(
          await listSavedSuggestionFingerprints(aiReflectionResultId),
        );
        if (!active || saved.size === 0) {
          return;
        }
        const restored: Record<string, SaveStatus> = {};
        result.prayerSuggestions.forEach((s, i) => {
          if (saved.has(prayerSuggestionFingerprint(s))) {
            restored[`prayer-${i}`] = "saved";
          }
        });
        result.gratitudeSuggestions.forEach((s, i) => {
          if (saved.has(gratitudeSuggestionFingerprint(s))) {
            restored[`gratitude-${i}`] = "saved";
          }
        });
        result.faithfulnessMomentSuggestions.forEach((s, i) => {
          if (saved.has(faithfulnessSuggestionFingerprint(s))) {
            restored[`moment-${i}`] = "saved";
          }
        });
        result.lessonSuggestions.forEach((s, i) => {
          if (saved.has(lessonSuggestionFingerprint(s))) {
            restored[`lesson-${i}`] = "saved";
          }
        });
        result.instructionSuggestions.forEach((s, i) => {
          if (saved.has(instructionSuggestionFingerprint(s))) {
            restored[`instruction-${i}`] = "saved";
          }
        });
        setStatuses((prev) => ({ ...restored, ...prev }));
      } catch (error: unknown) {
        // A read failure shouldn't block saving again; only log a category.
        console.warn(
          "Failed to load saved AI suggestion state:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [aiReflectionResultId, result]);

  async function runSave(
    key: string,
    meta: SaveMeta,
    save: () => Promise<{ id: string }>,
  ) {
    if (statuses[key] === "saving" || statuses[key] === "saved") {
      return;
    }
    setStatuses((prev) => ({ ...prev, [key]: "saving" }));
    try {
      const created = await save();
      // Persist the saved state so the card stays saved across reopens.
      await markAiSuggestionSaved({
        aiReflectionResultId,
        journalEntryId,
        suggestionKind: meta.kind,
        suggestionFingerprint: meta.fingerprint,
        suggestionIndex: meta.index,
        createdItemId: created.id,
        createdItemType: meta.createdItemType,
      });
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
        <Text style={styles.reflectionLabel}>A reflection to consider</Text>
        {toParagraphs(result.pastoralReflection).map((paragraph, index) => (
          <Text
            key={`reflection-${index}`}
            style={[
              styles.reflectionBody,
              index > 0 && styles.reflectionParagraphSpacing,
            ]}
          >
            {paragraph}
          </Text>
        ))}
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
                titleLabel="Prayer focus"
                descriptionLabel="Details"
                supportsTags
                supportsFollowUp
                initial={{
                  title: prayer.title,
                  description: prayer.description ?? "",
                  tags: prayer.tags ?? [],
                  followUpAt: prayer.followUpAt ?? null,
                }}
                status={statuses[key] ?? "idle"}
                saveLabel="Save prayer request"
                savedLabel="Saved to Prayer"
                onSave={(draft) =>
                  void runSave(
                    key,
                    {
                      kind: "prayer",
                      index,
                      fingerprint: prayerSuggestionFingerprint(prayer),
                      createdItemType: "prayer_request",
                    },
                    () =>
                      createPrayerRequest({
                        title: draft.title,
                        description: draft.description || null,
                        tags: draft.tags,
                        status: "active",
                        sourceJournalEntryId: journalEntryId,
                        followUpAt: draft.followUpAt,
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
                titleLabel="Gratitude"
                titleMultiline
                supportsTags
                initial={{
                  title: gratitude.content,
                  description: "",
                  tags: gratitude.tags ?? [],
                  followUpAt: null,
                }}
                status={statuses[key] ?? "idle"}
                saveLabel="Save gratitude"
                savedLabel="Saved to Gratitude"
                onSave={(draft) =>
                  void runSave(
                    key,
                    {
                      kind: "gratitude",
                      index,
                      fingerprint: gratitudeSuggestionFingerprint(gratitude),
                      createdItemType: "gratitude",
                    },
                    () =>
                      createGratitude({
                        content: draft.title,
                        tags: draft.tags,
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
        <Section title="Suggested testimonies">
          {result.faithfulnessMomentSuggestions.map((moment, index) => {
            const key = `moment-${index}`;
            return (
              <SuggestionCard
                key={key}
                titleLabel="Testimony"
                titleMultiline
                supportsTags
                initial={{
                  title: moment.content,
                  description: "",
                  tags: moment.tags ?? [],
                  followUpAt: null,
                }}
                status={statuses[key] ?? "idle"}
                saveLabel="Save testimony"
                savedLabel="Saved to Testimonies"
                onSave={(draft) =>
                  void runSave(
                    key,
                    {
                      kind: "faithfulness_moment",
                      index,
                      fingerprint: faithfulnessSuggestionFingerprint(moment),
                      createdItemType: "win",
                    },
                    () =>
                      createWin({
                        content: draft.title,
                        tags: draft.tags,
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

      {result.lessonSuggestions.length > 0 ? (
        <Section title="Lessons to consider">
          {result.lessonSuggestions.map((lesson, index) => {
            const key = `lesson-${index}`;
            return (
              <SuggestionCard
                key={key}
                titleLabel="Lesson to consider"
                descriptionLabel="What you may be noticing"
                supportsTags
                initial={{
                  title: lesson.title,
                  description: lesson.content,
                  tags: lesson.tags ?? [],
                  followUpAt: null,
                }}
                status={statuses[key] ?? "idle"}
                saveLabel="Save lesson"
                savedLabel="Saved to Lessons"
                onSave={(draft) =>
                  void runSave(
                    key,
                    {
                      kind: "lesson",
                      index,
                      fingerprint: lessonSuggestionFingerprint(lesson),
                      createdItemType: "lesson",
                    },
                    () =>
                      createLesson({
                        title: draft.title,
                        content: draft.description || draft.title,
                        tags: draft.tags,
                        sourceJournalEntryId: journalEntryId,
                        status: "active",
                        syncStatus: "local_only",
                      }),
                  )
                }
              />
            );
          })}
        </Section>
      ) : null}

      {result.instructionSuggestions.length > 0 ? (
        <Section title="Instructions to consider">
          {result.instructionSuggestions.map((instruction, index) => {
            const key = `instruction-${index}`;
            return (
              <SuggestionCard
                key={key}
                titleLabel="Instruction to consider"
                descriptionLabel="What you sense you're being asked"
                supportsTags
                supportsFollowUp
                followUpLabel="By when (optional)"
                followUpSummaryLabel="By when"
                followUpPlaceholder="Add a target date"
                initial={{
                  title: instruction.title,
                  description: instruction.content,
                  tags: instruction.tags ?? [],
                  followUpAt: instruction.dueAt ?? null,
                }}
                status={statuses[key] ?? "idle"}
                saveLabel="Save instruction"
                savedLabel="Saved to Instructions"
                onSave={(draft) =>
                  void runSave(
                    key,
                    {
                      kind: "instruction",
                      index,
                      fingerprint: instructionSuggestionFingerprint(instruction),
                      createdItemType: "instruction",
                    },
                    () =>
                      createRevelation({
                        kind: "instruction",
                        title: draft.title,
                        content: draft.description || draft.title,
                        dueAt: draft.followUpAt,
                        tags: draft.tags,
                        sourceJournalEntryId: journalEntryId,
                        status: "active",
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
    lineHeight: 24,
  },
  reflectionParagraphSpacing: {
    marginTop: spacing.sm,
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
