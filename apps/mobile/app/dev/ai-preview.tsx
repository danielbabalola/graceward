import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AnalyzeReflectionResponse } from "@graceward/ai-schemas";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { AiReflectionResultView } from "@/components/ai/AiReflectionResultView";
import { colors, radii, spacing, typography } from "@/theme/tokens";

/**
 * Dev-only visual preview for the AI reflection result, including the Scripture,
 * quote, and suggested-prayer sections. Not linked from anywhere in the app —
 * open it by navigating to the `/dev/ai-preview` route. It renders the real
 * AiReflectionResultView in `preview` mode, so nothing is written to the local
 * database (save buttons just flip to "saved" visually). Sample text mirrors the
 * curated packs so the wording is representative.
 */

type Sample = { id: string; label: string; result: AnalyzeReflectionResponse };

const SAMPLES: Sample[] = [
  {
    id: "full",
    label: "Full",
    result: {
      pastoralReflection:
        "It sounds like today carried both weight and small mercies. You kept showing up even when it was hard, and you brought it honestly to God rather than carrying it alone.\n\nThat honesty is its own kind of faith. You don't have to have it all resolved tonight to be held.",
      suggestedPrayer:
        "Father, you are good and you are near, even on the heavy days. I'm tired, and I bring you the parts of today I couldn't fix. Thank you for the small mercies I almost missed. Help me to trust you with tomorrow instead of carrying it alone, and let your will be done in me. In Jesus' name, amen.",
      scripture: {
        reference: "Psalm 55:22",
        text: "Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved.",
        translation: "KJV",
        theme: "Trust",
      },
      quote: {
        text: "Never be afraid to trust an unknown future to a known God.",
        author: "Corrie ten Boom",
      },
      prayerSuggestions: [
        {
          title: "Strength for tomorrow",
          description: "Ask God for steadiness going into tomorrow's tasks.",
          tags: ["Trust", "Work"],
        },
      ],
      gratitudeSuggestions: [
        { content: "A small mercy I almost missed today", tags: ["Gratitude"] },
      ],
      faithfulnessMomentSuggestions: [],
      lessonSuggestions: [
        {
          title: "Honesty before God",
          content:
            "You may be learning that bringing it to God honestly is itself a kind of trust.",
          tags: ["Trust"],
        },
      ],
      instructionSuggestions: [],
      gentleFollowUpQuestions: [
        "What is one burden you can hand to God tonight?",
      ],
    },
  },
  {
    id: "lament",
    label: "Lament",
    result: {
      pastoralReflection:
        "This is heavy, and it's okay to let it be heavy. You don't have to rush toward a silver lining. Grief brought to God is not weakness; it's trust that he can hold it.",
      suggestedPrayer:
        "Lord, I don't have tidy words tonight. It hurts, and I'm bringing the ache to you instead of hiding it. You are near to the brokenhearted, so be near to me now. I can't see the way through, but I choose to trust your heart. Not my will, but yours. Amen.",
      scripture: {
        reference: "Psalm 34:18",
        text: "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.",
        translation: "KJV",
        theme: "Grief",
      },
      quote: {
        text: "God whispers to us in our pleasures, speaks in our conscience, but shouts in our pain: it is His megaphone to rouse a deaf world.",
        author: "C. S. Lewis",
        source: "The Problem of Pain",
      },
      prayerSuggestions: [],
      gratitudeSuggestions: [],
      faithfulnessMomentSuggestions: [],
      lessonSuggestions: [],
      instructionSuggestions: [],
      gentleFollowUpQuestions: [
        "What would it look like to let God sit with you in this, without fixing it yet?",
      ],
      safetyNote:
        "If the weight ever feels like too much to carry, please reach out to someone you trust or a local support line. You don't have to be alone in it.",
    },
  },
  {
    id: "minimal",
    label: "No verse/quote",
    result: {
      pastoralReflection:
        "A quiet, ordinary day — and those matter too. Nothing dramatic, just faithfulness in the small things.",
      suggestedPrayer:
        "Thank you, Lord, for an ordinary day held in your hands. Help me to be faithful in the small things and to notice you in them. Amen.",
      prayerSuggestions: [],
      gratitudeSuggestions: [
        { content: "An ordinary, peaceful day", tags: ["Gratitude", "Rest"] },
      ],
      faithfulnessMomentSuggestions: [],
      lessonSuggestions: [],
      instructionSuggestions: [],
      gentleFollowUpQuestions: [],
    },
  },
];

export default function AiPreviewScreen() {
  const [selectedId, setSelectedId] = useState(SAMPLES[0].id);
  const sample = SAMPLES.find((s) => s.id === selectedId) ?? SAMPLES[0];

  return (
    <FlowScreen
      title="AI result preview"
      subtitle="Dev only · nothing is saved"
    >
      <View style={styles.chips}>
        {SAMPLES.map((s) => {
          const active = s.id === selectedId;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSelectedId(s.id)}
              accessibilityRole="button"
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AiReflectionResultView
        preview
        journalEntryId="preview-entry"
        aiReflectionResultId="preview-result"
        result={sample.result}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  chipActive: {
    borderColor: colors.primaryDeep,
    backgroundColor: colors.primaryLight,
  },
  chipLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: colors.primaryDeep,
    fontWeight: "600",
  },
});
