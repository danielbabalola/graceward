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
  entryDate?: string;
  status?: JournalStatus;
  syncStatus?: SyncStatus;
};

export type TranscriptionStatus =
  | "none"
  | "pending"
  | "processing"
  | "complete"
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
  sourceJournalEntryId?: string | null;
  followUpAt?: string | null;
  status?: PrayerRequestStatus;
  syncStatus?: SyncStatus;
};

export type UpdatePrayerRequestInput = {
  title?: string;
  description?: string | null;
  followUpAt?: string | null;
};

export type Gratitude = {
  id: string;
  journalEntryId: string | null;
  content: string;
  category: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateGratitudeInput = {
  content: string;
  category?: string | null;
  journalEntryId?: string | null;
  syncStatus?: SyncStatus;
};

export type UpdateGratitudeInput = {
  content?: string;
  category?: string | null;
};

export type Win = {
  id: string;
  journalEntryId: string | null;
  content: string;
  faithfulnessTheme: string | null;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateWinInput = {
  content: string;
  faithfulnessTheme?: string | null;
  journalEntryId?: string | null;
  syncStatus?: SyncStatus;
};

export type UpdateWinInput = {
  content?: string;
  faithfulnessTheme?: string | null;
};
