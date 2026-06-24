import type {
  JournalEntry,
  JournalInputType,
  JournalMode,
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

export function modeLabel(mode: JournalMode): string {
  return modeLabels[mode] ?? mode;
}

export function inputTypeLabel(inputType: JournalInputType): string {
  return inputTypeLabels[inputType] ?? inputType;
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
