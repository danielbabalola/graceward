/**
 * Zod schemas for the AI reflection analysis feature, shared between the API
 * (runtime validation of requests, AI provider output, and responses) and the
 * mobile app (type-only imports — no zod is bundled into the client).
 */
import { z } from "zod";

export const AI_SCHEMAS_PACKAGE_VERSION = "0.0.0";

/** Prompt identifier persisted alongside results for future versioning. */
export const REFLECTION_PROMPT_VERSION = "reflection-v1";

/** Reasonable MVP upper bound on reflection length sent for analysis. */
export const MAX_REFLECTION_CHARS = 8000;

/**
 * Defensive upper bound on how many suggestions of each kind we keep from the
 * model. This is a safety clamp only — the prompt lets the actual count follow
 * the reflection (which may legitimately be zero, one, or several).
 */
export const MAX_SUGGESTIONS_PER_KIND = 8;
export const MAX_FOLLOW_UP_QUESTIONS = 5;

/** Modes that AI reflection v1 supports (text reflections only). */
export const analyzableModeSchema = z.enum([
  "free_flow",
  "regular",
  "lament",
  "rejoice",
]);
export type AnalyzableMode = z.infer<typeof analyzableModeSchema>;

export const analyzeReflectionRequestSchema = z.object({
  journalEntryId: z.string().min(1),
  entryDate: z.string().min(1),
  mode: analyzableModeSchema,
  inputType: z.literal("text"),
  rawText: z.string().trim().min(1).max(MAX_REFLECTION_CHARS),
});
export type AnalyzeReflectionRequest = z.infer<
  typeof analyzeReflectionRequestSchema
>;

export const prayerSuggestionSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  // Optional follow-up date (calendar date, YYYY-MM-DD) set ONLY when the
  // reflection text itself names a time for this prayer (e.g. "by next
  // Monday"). Resolved by the model against the entry date. Null/omitted means
  // the user didn't specify one — never inferred or invented.
  followUpAt: z.string().date().nullable().optional(),
});
export type PrayerSuggestion = z.infer<typeof prayerSuggestionSchema>;

export const gratitudeSuggestionSchema = z.object({
  content: z.string().min(1),
  category: z.string().optional(),
});
export type GratitudeSuggestion = z.infer<typeof gratitudeSuggestionSchema>;

export const faithfulnessMomentSuggestionSchema = z.object({
  content: z.string().min(1),
  faithfulnessTheme: z.string().optional(),
});
export type FaithfulnessMomentSuggestion = z.infer<
  typeof faithfulnessMomentSuggestionSchema
>;

export const analyzeReflectionResponseSchema = z.object({
  pastoralReflection: z.string().min(1),
  prayerSuggestions: z.array(prayerSuggestionSchema).default([]),
  gratitudeSuggestions: z.array(gratitudeSuggestionSchema).default([]),
  faithfulnessMomentSuggestions: z
    .array(faithfulnessMomentSuggestionSchema)
    .default([]),
  gentleFollowUpQuestions: z.array(z.string().min(1)).default([]),
  safetyNote: z.string().optional(),
});
export type AnalyzeReflectionResponse = z.infer<
  typeof analyzeReflectionResponseSchema
>;

/** Consistent API error envelope (see docs/07_API_SPEC.md). */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};
