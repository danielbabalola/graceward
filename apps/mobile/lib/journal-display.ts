import type {
  JournalEntry,
  JournalInputType,
  JournalMode,
  JournalStatus,
  SyncStatus,
} from "@graceward/shared";

const modeLabels: Record<JournalMode, string> = {
  free_flow: "Free Flow",
  regular: "Regular Reflection",
  lament: "Lament",
  rejoice: "Rejoice",
  conflict: "Conflict",
  decision: "Decision",
  relationship: "Relationship",
  gratitude: "Gratitude",
  scripture_meditation: "Scripture Meditation",
};

const inputTypeLabels: Record<JournalInputType, string> = {
  text: "Text",
  voice: "Voice",
  mixed: "Mixed",
};

const statusLabels: Record<JournalStatus, string> = {
  draft: "Draft",
  saved: "Saved",
  processing: "Processing",
  processed: "Processed",
  failed: "Needs attention",
};

const syncStatusLabels: Record<SyncStatus, string> = {
  local_only: "Private to this device",
  pending_upload: "Waiting to sync",
  syncing: "Syncing",
  synced: "Synced",
  failed: "Sync failed",
  conflict: "Sync conflict",
  deleted_pending_sync: "Removal pending",
};

export function modeLabel(mode: JournalMode): string {
  return modeLabels[mode] ?? mode;
}

export function inputTypeLabel(inputType: JournalInputType): string {
  return inputTypeLabels[inputType] ?? inputType;
}

export function statusLabel(status: JournalStatus): string {
  return statusLabels[status] ?? status;
}

export function syncStatusLabel(syncStatus: SyncStatus): string {
  return syncStatusLabels[syncStatus] ?? syncStatus;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatEntryDate(entryDate: string): string {
  const parsed = new Date(`${entryDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return entryDate;
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const MAX_PREVIEW_LENGTH = 120;

/** Calm secondary line for an entry: date · mode · input type. */
export function entryMetaLine(entry: JournalEntry): string {
  return `${formatEntryDate(entry.entryDate)} · ${modeLabel(entry.mode)} · ${inputTypeLabel(
    entry.inputType,
  )}`;
}

/**
 * A short body preview for an entry's raw text, or null when the entry has no
 * text (e.g. a voice-only reflection). Distinct from `entryPreview`, which
 * falls back to the title; here we only return actual body text so callers can
 * show a calm voice label instead.
 */
export function journalBodyPreview(entry: JournalEntry): string | null {
  const raw = entry.rawText?.trim();
  if (!raw) {
    return null;
  }
  const firstLine = raw.split("\n")[0]?.trim() ?? raw;
  if (firstLine.length <= MAX_PREVIEW_LENGTH) {
    return firstLine;
  }
  return `${firstLine.slice(0, MAX_PREVIEW_LENGTH).trimEnd()}…`;
}

/**
 * Short, calm label for a journal entry used when linking another item back to
 * its source reflection. Voice-only entries without a title read as a generic
 * voice reflection rather than exposing any body text.
 */
export function sourceReflectionLabel(entry: JournalEntry): string {
  const title = entry.title?.trim();
  if (title) {
    return title;
  }
  return entry.inputType === "voice" ? "Voice reflection" : "Untitled reflection";
}

export function entryPreview(entry: JournalEntry): string {
  if (entry.title && entry.title.trim().length > 0) {
    return entry.title;
  }

  const raw = entry.rawText?.trim();
  if (!raw) {
    return "Untitled reflection";
  }

  const firstLine = raw.split("\n")[0]?.trim() ?? raw;
  if (firstLine.length <= MAX_PREVIEW_LENGTH) {
    return firstLine;
  }
  return `${firstLine.slice(0, MAX_PREVIEW_LENGTH).trimEnd()}…`;
}
