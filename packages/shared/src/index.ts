export const APP_NAME = "Graceward";

export type HealthResponse = {
  status: "ok";
  service: "api";
};

export type ReflectionPath = "free_flow" | "guided";

export type JournalMode =
  | "free_flow"
  | "regular"
  | "lament"
  | "rejoice"
  | "conflict"
  | "decision"
  | "relationship"
  | "gratitude"
  | "scripture_meditation";

export type JournalInputType = "text" | "voice" | "mixed";

export type JournalStatus =
  | "draft"
  | "saved"
  | "processing"
  | "processed"
  | "failed";

export type SyncStatus =
  | "local_only"
  | "pending_upload"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict"
  | "deleted_pending_sync";

export type JournalEntry = {
  id: string;
  entryDate: string;
  reflectionPath: ReflectionPath;
  mode: JournalMode;
  inputType: JournalInputType;
  rawText: string | null;
  title: string | null;
  structuredPayloadJson: string | null;
  status: JournalStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateJournalEntryInput = {
  reflectionPath: ReflectionPath;
  mode: JournalMode;
  inputType: JournalInputType;
  rawText?: string | null;
  title?: string | null;
  structuredPayloadJson?: string | null;
  entryDate?: string;
  status?: JournalStatus;
  syncStatus?: SyncStatus;
  tags?: string[];
};

export type TranscriptionStatus =
  | "none"
  | "pending"
  | "processing"
  // Manual voice transcription v1 uses "completed" for a finished transcript.
  // "complete" is retained for backward compatibility with earlier data.
  | "complete"
  | "completed"
  | "failed";

export type RetentionPolicy =
  | "delete_after_transcription"
  | "keep_device_only"
  | "encrypted_cloud_backup";

export type AudioAsset = {
  id: string;
  journalEntryId: string;
  localFilePath: string;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  transcriptionStatus: TranscriptionStatus;
  retentionPolicy: RetentionPolicy;
  syncStatus: SyncStatus;
  createdAt: string;
  deletedAt: string | null;
};

export type CreateAudioAssetInput = {
  journalEntryId: string;
  localFilePath: string;
  durationSeconds?: number | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  transcriptionStatus?: TranscriptionStatus;
  retentionPolicy?: RetentionPolicy;
  syncStatus?: SyncStatus;
};

export type PrayerRequestStatus = "active" | "answered" | "archived";

export type PrayerRequest = {
  id: string;
  title: string;
  description: string | null;
  sourceJournalEntryId: string | null;
  status: PrayerRequestStatus;
  followUpAt: string | null;
  answeredAt: string | null;
  answerDescription: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreatePrayerRequestInput = {
  title: string;
  description?: string | null;
  tags?: string[];
  sourceJournalEntryId?: string | null;
  followUpAt?: string | null;
  status?: PrayerRequestStatus;
  syncStatus?: SyncStatus;
};

export type UpdatePrayerRequestInput = {
  title?: string;
  description?: string | null;
  followUpAt?: string | null;
  tags?: string[];
};

export type Gratitude = {
  id: string;
  journalEntryId: string | null;
  content: string;
  /** @deprecated Superseded by unified tags; retained for backward compat. */
  category: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateGratitudeInput = {
  content: string;
  /** @deprecated Use `tags`. Retained so older callers keep compiling. */
  category?: string | null;
  tags?: string[];
  journalEntryId?: string | null;
  syncStatus?: SyncStatus;
};

export type UpdateGratitudeInput = {
  content?: string;
  /** @deprecated Use `tags`. */
  category?: string | null;
  tags?: string[];
};

export type Win = {
  id: string;
  journalEntryId: string | null;
  content: string;
  /** @deprecated Superseded by unified tags; retained for backward compat. */
  faithfulnessTheme: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateWinInput = {
  content: string;
  /** @deprecated Use `tags`. Retained so older callers keep compiling. */
  faithfulnessTheme?: string | null;
  tags?: string[];
  journalEntryId?: string | null;
  syncStatus?: SyncStatus;
};

export type UpdateWinInput = {
  content?: string;
  /** @deprecated Use `tags`. */
  faithfulnessTheme?: string | null;
  tags?: string[];
};

export type LessonStatus = "active" | "archived";

/**
 * A lesson is something the user is learning, noticing, or discerning with God.
 * Humble by design — it records the user's own reflection, never a claim that
 * "God said" anything. Stored locally only, like every other content table.
 */
export type Lesson = {
  id: string;
  title: string;
  content: string;
  /** @deprecated Superseded by unified tags; retained for backward compat. */
  theme: string | null;
  sourceJournalEntryId: string | null;
  status: LessonStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateLessonInput = {
  title: string;
  content: string;
  /** @deprecated Use `tags`. Retained so older callers keep compiling. */
  theme?: string | null;
  tags?: string[];
  sourceJournalEntryId?: string | null;
  status?: LessonStatus;
  syncStatus?: SyncStatus;
};

export type UpdateLessonInput = {
  title?: string;
  content?: string;
  /** @deprecated Use `tags`. */
  theme?: string | null;
  tags?: string[];
};

export type InstructionStatus = "active" | "fulfilled";

/**
 * An instruction is something the user believes God has instructed or called
 * them to do, recorded in their own words. Manual only by design — never
 * generated or asserted by the AI, and never framed as the app speaking for
 * God. Stored locally only, like every other content table. "Fulfilled" marks
 * an instruction the user has acted on; it is never deleted automatically.
 */
export type Instruction = {
  id: string;
  title: string;
  content: string;
  /** Optional, gentle "by when" target date (YYYY-MM-DD); never a hard deadline. */
  dueAt: string | null;
  sourceJournalEntryId: string | null;
  status: InstructionStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateInstructionInput = {
  title: string;
  content: string;
  dueAt?: string | null;
  tags?: string[];
  sourceJournalEntryId?: string | null;
  status?: InstructionStatus;
  syncStatus?: SyncStatus;
};

export type UpdateInstructionInput = {
  title?: string;
  content?: string;
  dueAt?: string | null;
  tags?: string[];
};

/* -------------------------------------------------------------------------- */
/* Unified tags                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Content types that can carry unified tags. `win` is the internal name for a
 * faithfulness moment (user-facing language always says "faithfulness moment").
 */
export type TaggableEntryType =
  | "gratitude"
  | "win"
  | "lesson"
  | "instruction"
  | "prayer_request"
  | "journal_entry";

/**
 * A single, shared tag. `name` preserves the casing first entered by the user
 * (or suggested by the AI); `slug` is the normalized, lowercased form used to
 * dedupe so "Family" and "family" resolve to one tag.
 */
export type Tag = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** A tag plus how many (non-deleted) entries currently carry it. */
export type TagWithCount = Tag & { count: number };

/** A lightweight reference to a tagged entry, used by the cross-type browse. */
export type TaggedEntryRef = {
  entryType: TaggableEntryType;
  entryId: string;
  createdAt: string;
};
