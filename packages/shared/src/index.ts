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
  rawText: string;
  title?: string | null;
  entryDate?: string;
  status?: JournalStatus;
  syncStatus?: SyncStatus;
};
