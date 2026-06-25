/**
 * Zod schemas for the AI reflection analysis feature, shared between the API
 * (runtime validation of requests, AI provider output, and responses) and the
 * mobile app (type-only imports — no zod is bundled into the client).
 */
import { z } from "zod";

export const AI_SCHEMAS_PACKAGE_VERSION = "0.0.0";

/** Prompt identifier persisted alongside results for future versioning. */
export const REFLECTION_PROMPT_VERSION = "reflection-v6";

/**
 * Upper bound on how many unified tags the model may suggest per entry. A safety
 * clamp only; the prompt asks for a small, relevant set (often zero to three).
 */
export const MAX_TAGS_PER_ENTRY = 5;

/**
 * A small, curated set of canonical theme words for MVP. This is the single
 * source of truth shared by the AI prompts (which are nudged to prefer these
 * reusable words) and the mobile TagEditor (which seeds suggestions from them,
 * especially for a new user with no tags yet). Free-text tags remain fully
 * allowed — this list only encourages a consistent, shared vocabulary so the
 * same theme can link a gratitude, a prayer, and a reflection. It is an MVP
 * seed for future tag/theme features: intentionally short, not exhaustive, and
 * never enforced.
 */
export const CANONICAL_TAGS = [
  "Family",
  "Marriage",
  "Friendship",
  "Work",
  "Provision",
  "Health",
  "Healing",
  "Guidance",
  "Trust",
  "Patience",
  "Forgiveness",
  "Peace",
  "Gratitude",
  "Faith",
  "Hope",
  "Repentance",
  "Wisdom",
  "Calling",
  "Rest",
  "Grief",
] as const;

/** Per-suggestion unified tags: short, optional, may be empty. */
const tagsSchema = z.array(z.string().min(1)).optional();

/** Reasonable MVP upper bound on reflection length sent for analysis. */
export const MAX_REFLECTION_CHARS = 8000;

/**
 * Defensive upper bound on how many suggestions of each kind we keep from the
 * model. This is a safety clamp only — the prompt lets the actual count follow
 * the reflection (which may legitimately be zero, one, or several).
 */
export const MAX_SUGGESTIONS_PER_KIND = 8;
export const MAX_FOLLOW_UP_QUESTIONS = 5;

/**
 * Defensive upper bound on the suggested prayer length (characters). The prompt
 * intentionally lets the prayer be as long or as short as the reflection
 * warrants (no fixed sentence count), so this is purely a high safety clamp
 * against a runaway response — matched to the reflection input bound — and is
 * not meant to shape or shorten a genuine prayer.
 */
export const MAX_SUGGESTED_PRAYER_CHARS = MAX_REFLECTION_CHARS;

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
  tags: tagsSchema,
});
export type PrayerSuggestion = z.infer<typeof prayerSuggestionSchema>;

/**
 * A gratitude: everyday thankfulness — the ordinary good gifts of a day. Common
 * (a day may hold several). Distinct from a testimony, which is a rare
 * "remember this day" milestone; the two never overlap.
 */
export const gratitudeSuggestionSchema = z.object({
  content: z.string().min(1),
  /** @deprecated Superseded by `tags`; kept optional for backward compat. */
  category: z.string().optional(),
  tags: tagsSchema,
});
export type GratitudeSuggestion = z.infer<typeof gratitudeSuggestionSchema>;

/**
 * A testimony (faithfulness moment): a significant highlight the user would want
 * to look back on and remember on a specific day — an answered prayer, someone
 * coming to faith, a healing, a new job, an engagement/marriage, a major
 * provision, a clear breakthrough. Rare by design (most days have none) and
 * never the same as an everyday gratitude.
 */
export const faithfulnessMomentSuggestionSchema = z.object({
  content: z.string().min(1),
  /** @deprecated Superseded by `tags`; kept optional for backward compat. */
  faithfulnessTheme: z.string().optional(),
  tags: tagsSchema,
});
export type FaithfulnessMomentSuggestion = z.infer<
  typeof faithfulnessMomentSuggestionSchema
>;

/**
 * A lesson the user may be noticing in their reflection — something they are
 * learning or that God may be forming in them. Offered humbly for the user to
 * consider and optionally save; never a claim that God definitively said it.
 */
export const lessonSuggestionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  /** @deprecated Superseded by `tags`; kept optional for backward compat. */
  theme: z.string().optional(),
  tags: tagsSchema,
});
export type LessonSuggestion = z.infer<typeof lessonSuggestionSchema>;

/**
 * An instruction the user may have expressed in their reflection — something
 * they sense God is asking, leading, or calling them to do. Surfaced ONLY when
 * the user explicitly said so in their own words, attributed to them (never the
 * app claiming "God told you"), and always for the user to review and save
 * themselves. This is the strictest suggestion type for that reason.
 */
export const instructionSuggestionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  // Optional "by when" target date (calendar date, YYYY-MM-DD) set ONLY when the
  // user themselves named a time they intend to act by. Resolved by the model
  // against the entry date. Null/omitted means none was stated — never inferred.
  dueAt: z.string().date().nullable().optional(),
  tags: tagsSchema,
});
export type InstructionSuggestion = z.infer<typeof instructionSuggestionSchema>;

/**
 * A dream the user wants to record, kept faithfully in their own words. The AI
 * only tidies what they said into a short title and their account — it never
 * interprets the dream, assigns meaning, or claims to speak for God.
 */
export const dreamSuggestionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: tagsSchema,
});
export type DreamSuggestion = z.infer<typeof dreamSuggestionSchema>;

/**
 * A prophetic word the user senses they have received, recorded faithfully in
 * their own words. The AI only tidies what they said into a short title and the
 * word itself — it never validates, embellishes, interprets, or claims to speak
 * for God.
 */
export const prophecySuggestionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: tagsSchema,
});
export type ProphecySuggestion = z.infer<typeof prophecySuggestionSchema>;

/**
 * A Scripture passage attached to the reflection. The wording is NOT authored
 * by the model — the server resolves it from a curated, pre-vetted pack (the
 * model only chooses which passage fits), so the reference and text are always
 * accurate. Optional: omitted when no curated passage genuinely fits.
 */
export const scriptureSchema = z.object({
  reference: z.string().min(1),
  text: z.string().min(1),
  translation: z.string().min(1),
  /** Primary theme word for an optional small label (e.g. "Trust"). */
  theme: z.string().optional(),
});
export type Scripture = z.infer<typeof scriptureSchema>;

/**
 * A Christian quote/thought attached to the reflection. Like {@link scriptureSchema},
 * the text and attribution come from a curated, pre-vetted pack resolved on the
 * server (never generated by the model), so quotes are never misattributed or
 * fabricated. Optional: omitted when nothing curated genuinely fits.
 */
export const quoteSchema = z.object({
  text: z.string().min(1),
  author: z.string().min(1),
  source: z.string().optional(),
});
export type Quote = z.infer<typeof quoteSchema>;

export const analyzeReflectionResponseSchema = z.object({
  pastoralReflection: z.string().min(1),
  /**
   * A single short prayer in the user's own voice, shaped by the Lord's Prayer,
   * that they can pray in response to their reflection. Model-authored; may be
   * omitted when a prayer would be hollow.
   */
  suggestedPrayer: z.string().optional(),
  /** A fitting Scripture passage, resolved server-side from the curated pack. */
  scripture: scriptureSchema.optional(),
  /** A fitting quote/thought, resolved server-side from the curated pack. */
  quote: quoteSchema.optional(),
  prayerSuggestions: z.array(prayerSuggestionSchema).default([]),
  gratitudeSuggestions: z.array(gratitudeSuggestionSchema).default([]),
  faithfulnessMomentSuggestions: z
    .array(faithfulnessMomentSuggestionSchema)
    .default([]),
  lessonSuggestions: z.array(lessonSuggestionSchema).default([]),
  instructionSuggestions: z.array(instructionSuggestionSchema).default([]),
  gentleFollowUpQuestions: z.array(z.string().min(1)).default([]),
  safetyNote: z.string().optional(),
});
export type AnalyzeReflectionResponse = z.infer<
  typeof analyzeReflectionResponseSchema
>;

/**
 * The raw shape the model returns for a reflection analysis. It mirrors the
 * public response EXCEPT it does not author Scripture/quote text: instead it
 * returns the chosen `scriptureId`/`quoteId` (or null) picked from the curated
 * candidates injected into the prompt. The server validates against this
 * schema, then resolves the ids to canonical entries to build the public
 * {@link analyzeReflectionResponseSchema} response.
 */
export const reflectionModelOutputSchema = analyzeReflectionResponseSchema
  .omit({ scripture: true, quote: true })
  .extend({
    scriptureId: z.string().nullable().optional(),
    quoteId: z.string().nullable().optional(),
  });
export type ReflectionModelOutput = z.infer<typeof reflectionModelOutputSchema>;

/** Consistent API error envelope (see docs/07_API_SPEC.md). */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
};

/* -------------------------------------------------------------------------- */
/* AI access control (closed-beta install ID)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Header that carries the anonymous, on-device install ID with AI requests.
 * Fastify lower-cases incoming header names, so server lookups use the
 * lower-cased form; clients may send any casing. This is NOT an account or a
 * device/advertising identifier — it is a random per-install token used only to
 * apply per-install AI quotas for closed-beta abuse/cost control.
 */
export const INSTALL_ID_HEADER = "x-graceward-install-id";

/** Stable error codes for the closed-beta AI access-control layer. */
export const INSTALL_ID_REQUIRED_CODE = "INSTALL_ID_REQUIRED";
export const AI_QUOTA_EXCEEDED_CODE = "AI_QUOTA_EXCEEDED";
export const AI_DISABLED_CODE = "AI_DISABLED";

// Standard 8-4-4-4-12 hex UUID (any version). The mobile client generates the
// install ID with crypto.randomUUID(), so a UUID check is a strong, opaque
// format guard without coupling to a specific UUID version.
const INSTALL_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True when `value` is a well-formed install ID (an opaque UUID). Trims
 * surrounding whitespace; rejects anything that isn't a UUID-shaped string so a
 * missing/garbage header is cleanly rejected before any paid provider work.
 */
export function isValidInstallId(value: unknown): value is string {
  return typeof value === "string" && INSTALL_ID_RE.test(value.trim());
}

/* -------------------------------------------------------------------------- */
/* Voice transcription                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Upper bound on the audio upload accepted by POST /ai/transcribe-reflection.
 * 25 MB matches OpenAI's documented per-file limit for the audio transcription
 * endpoint, and is comfortably large for a single voice reflection.
 */
export const MAX_TRANSCRIPTION_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Audio container types accepted for transcription. Kept intentionally narrow
 * to the formats the mobile recorder produces (m4a/aac) plus the common ones
 * OpenAI supports, so unsupported uploads are rejected before any provider work.
 */
export const ALLOWED_TRANSCRIPTION_MIME_TYPES = [
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
] as const;

export type TranscriptionMimeType =
  (typeof ALLOWED_TRANSCRIPTION_MIME_TYPES)[number];

/** True when a content type is one we accept for transcription. */
export function isSupportedTranscriptionMimeType(
  mimeType: string | null | undefined,
): boolean {
  if (!mimeType) {
    return false;
  }
  // Some clients append parameters (e.g. "audio/m4a; codecs=..."). Compare the
  // bare type only, case-insensitively.
  const bare = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return (ALLOWED_TRANSCRIPTION_MIME_TYPES as readonly string[]).includes(bare);
}

/**
 * Non-file metadata that accompanies a transcription upload. Sent as multipart
 * form fields alongside the single audio file. Only identifiers — never any
 * transcript or audio content.
 */
export const transcribeReflectionMetadataSchema = z.object({
  journalEntryId: z.string().min(1),
  audioAssetId: z.string().min(1),
});
export type TranscribeReflectionMetadata = z.infer<
  typeof transcribeReflectionMetadataSchema
>;

/** Structured success body returned by POST /ai/transcribe-reflection. */
export const transcribeReflectionResponseSchema = z.object({
  transcript: z.string().min(1),
  provider: z.string().optional(),
  model: z.string().optional(),
});
export type TranscribeReflectionResponse = z.infer<
  typeof transcribeReflectionResponseSchema
>;

/* -------------------------------------------------------------------------- */
/* Voice entry structuring                                                     */
/* -------------------------------------------------------------------------- */

/** Prompt identifier persisted/sent for future versioning of structuring. */
export const STRUCTURE_ENTRY_PROMPT_VERSION = "structure-entry-v4";

/**
 * Defensive upper bound on the transcript length the server will structure.
 * A spoken note for a single entry is short; this guards the structuring call
 * if an unexpectedly long transcription comes back from the audio provider.
 */
export const MAX_VOICE_ENTRY_TRANSCRIPT_CHARS = 8000;

/**
 * Entry types that can be structured by the AI (from a spoken note or from
 * typed text the user asks to polish). These map 1:1 to the manual create
 * screens (prayer, gratitude, faithfulness, lesson, and the three revelation
 * kinds: dream, prophecy, instruction). "faithfulness" is the user-facing name
 * for the internal "wins" type. For the revelation kinds the AI only
 * transcribes/tidies the user's own words — it never originates, interprets, or
 * asserts anything from God.
 */
export const voiceEntryTypeSchema = z.enum([
  "prayer",
  "gratitude",
  "faithfulness",
  "lesson",
  "dream",
  "prophecy",
  "instruction",
]);
export type VoiceEntryType = z.infer<typeof voiceEntryTypeSchema>;

/**
 * Alias for the entry types the AI can structure, used by the typed-text
 * polishing endpoint. Same set as {@link voiceEntryTypeSchema}.
 */
export const structurableEntryTypeSchema = voiceEntryTypeSchema;
export type StructurableEntryType = VoiceEntryType;

/**
 * Per-type field schemas the AI must produce when structuring a note. Reuses
 * the existing suggestion shapes so a structured entry matches a
 * journal-suggested one exactly (same fields, same optionality).
 */
export const voiceEntryFieldSchemas = {
  prayer: prayerSuggestionSchema,
  gratitude: gratitudeSuggestionSchema,
  faithfulness: faithfulnessMomentSuggestionSchema,
  lesson: lessonSuggestionSchema,
  dream: dreamSuggestionSchema,
  prophecy: prophecySuggestionSchema,
  instruction: instructionSuggestionSchema,
} as const;

/**
 * Non-file metadata that accompanies a structure-voice-entry upload. Sent as
 * multipart form fields alongside the single audio file. The entry date lets
 * the model resolve any spoken follow-up time (e.g. "next Monday") for prayer.
 */
export const structureVoiceEntryMetadataSchema = z.object({
  entryType: voiceEntryTypeSchema,
  entryDate: z.string().min(1),
});
export type StructureVoiceEntryMetadata = z.infer<
  typeof structureVoiceEntryMetadataSchema
>;

/**
 * Structured success body returned by POST /ai/structure-voice-entry. A
 * discriminated union on `entryType` so `fields` is precisely the requested
 * entry type's shape, alongside the raw transcript the structuring was based on
 * (shown to the user so they can see what was heard before saving).
 */
export const structureVoiceEntryResponseSchema = z.discriminatedUnion(
  "entryType",
  [
    z.object({
      entryType: z.literal("prayer"),
      transcript: z.string().min(1),
      fields: prayerSuggestionSchema,
    }),
    z.object({
      entryType: z.literal("gratitude"),
      transcript: z.string().min(1),
      fields: gratitudeSuggestionSchema,
    }),
    z.object({
      entryType: z.literal("faithfulness"),
      transcript: z.string().min(1),
      fields: faithfulnessMomentSuggestionSchema,
    }),
    z.object({
      entryType: z.literal("lesson"),
      transcript: z.string().min(1),
      fields: lessonSuggestionSchema,
    }),
    z.object({
      entryType: z.literal("dream"),
      transcript: z.string().min(1),
      fields: dreamSuggestionSchema,
    }),
    z.object({
      entryType: z.literal("prophecy"),
      transcript: z.string().min(1),
      fields: prophecySuggestionSchema,
    }),
    z.object({
      entryType: z.literal("instruction"),
      transcript: z.string().min(1),
      fields: instructionSuggestionSchema,
    }),
  ],
);
export type StructureVoiceEntryResponse = z.infer<
  typeof structureVoiceEntryResponseSchema
>;

/* -------------------------------------------------------------------------- */
/* Typed-text entry structuring ("Polish with AI")                            */
/* -------------------------------------------------------------------------- */

/**
 * Defensive upper bound on the typed text the server will polish into one
 * entry's fields. Matches the spoken-note bound so both paths share a limit.
 */
export const MAX_TEXT_ENTRY_CHARS = MAX_VOICE_ENTRY_TRANSCRIPT_CHARS;

/**
 * JSON body for POST /ai/structure-text-entry. The user has typed a rough note
 * and asked Graceward to clean it up and suggest a title/tags. The entry date
 * lets the model resolve any stated follow-up/by-when time (prayer/instruction).
 */
export const structureTextEntryRequestSchema = z.object({
  entryType: structurableEntryTypeSchema,
  entryDate: z.string().min(1),
  text: z.string().trim().min(1).max(MAX_TEXT_ENTRY_CHARS),
});
export type StructureTextEntryRequest = z.infer<
  typeof structureTextEntryRequestSchema
>;

/**
 * Structured success body returned by POST /ai/structure-text-entry. A
 * discriminated union on `entryType` so `fields` is precisely the requested
 * entry type's shape. Unlike the voice variant there is no transcript — the
 * user's own typed text was the input and is already on screen.
 */
export const structureTextEntryResponseSchema = z.discriminatedUnion(
  "entryType",
  [
    z.object({ entryType: z.literal("prayer"), fields: prayerSuggestionSchema }),
    z.object({
      entryType: z.literal("gratitude"),
      fields: gratitudeSuggestionSchema,
    }),
    z.object({
      entryType: z.literal("faithfulness"),
      fields: faithfulnessMomentSuggestionSchema,
    }),
    z.object({ entryType: z.literal("lesson"), fields: lessonSuggestionSchema }),
    z.object({ entryType: z.literal("dream"), fields: dreamSuggestionSchema }),
    z.object({
      entryType: z.literal("prophecy"),
      fields: prophecySuggestionSchema,
    }),
    z.object({
      entryType: z.literal("instruction"),
      fields: instructionSuggestionSchema,
    }),
  ],
);
export type StructureTextEntryResponse = z.infer<
  typeof structureTextEntryResponseSchema
>;
