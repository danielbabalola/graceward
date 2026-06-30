import type {
  Gratitude,
  JournalEntry,
  Lesson,
  PrayerRequest,
  Revelation,
  Tag,
  Win,
} from "@graceward/shared";

/**
 * Parsing + validation for a Graceward local-data export file, kept pure and
 * Expo/SQLite-free so the shape checks can be unit-tested without a database or
 * a file picker. The DB layer (`importLocalData`) trusts the output of this
 * module and only maps fields to columns.
 *
 * Only the collections that represent restorable user content are accepted.
 * Audio assets (their recordings aren't in the export — restoring metadata
 * would point at files that don't exist on the new device), AI reflection
 * results, and saved-suggestion markers are intentionally dropped here.
 */

/** A single raw tag link, mirroring the export's `entryTags` entries. */
export type ImportEntryTagLink = {
  id: string;
  tagId: string;
  entryType: string;
  entryId: string;
  createdAt: string;
};

/** The validated, ready-to-insert collections from an export file. */
export type ParsedImportData = {
  journalEntries: JournalEntry[];
  prayerRequests: PrayerRequest[];
  gratitudes: Gratitude[];
  faithfulnessMoments: Win[];
  lessons: Lesson[];
  revelations: Revelation[];
  tags: Tag[];
  entryTags: ImportEntryTagLink[];
};

/** How many valid rows of each kind the file contained. */
export type ImportCounts = {
  journalEntries: number;
  prayerRequests: number;
  gratitudes: number;
  faithfulnessMoments: number;
  lessons: number;
  revelations: number;
  tags: number;
  entryTags: number;
};

export type ParseResult =
  | { ok: true; data: ParsedImportData; counts: ImportCounts }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Keeps only rows that are objects carrying a usable string `id`. */
function withId<T>(value: unknown): T[] {
  return toArray(value).filter(
    (row): row is T => isRecord(row) && isNonEmptyString(row.id),
  );
}

/** Keeps only tag links that carry the ids needed to reattach them. */
function validEntryTags(value: unknown): ImportEntryTagLink[] {
  return toArray(value).filter(
    (row): row is ImportEntryTagLink =>
      isRecord(row) &&
      isNonEmptyString(row.id) &&
      isNonEmptyString(row.tagId) &&
      isNonEmptyString(row.entryType) &&
      isNonEmptyString(row.entryId),
  );
}

/**
 * Parses the raw JSON text of an export file and returns the restorable
 * collections, or a human-readable error describing why it can't be imported.
 */
export function parseLocalDataExport(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: "This file isn't valid JSON, so it can't be imported.",
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: "This file isn't a Graceward export.",
    };
  }

  if (parsed.app !== "Graceward") {
    return {
      ok: false,
      error:
        "This file isn't a Graceward export. Choose a file you exported from Graceward.",
    };
  }

  const data: ParsedImportData = {
    journalEntries: withId<JournalEntry>(parsed.journalEntries),
    prayerRequests: withId<PrayerRequest>(parsed.prayerRequests),
    gratitudes: withId<Gratitude>(parsed.gratitudes),
    faithfulnessMoments: withId<Win>(parsed.faithfulnessMoments),
    lessons: withId<Lesson>(parsed.lessons),
    revelations: withId<Revelation>(parsed.revelations),
    tags: withId<Tag>(parsed.tags),
    entryTags: validEntryTags(parsed.entryTags),
  };

  const counts: ImportCounts = {
    journalEntries: data.journalEntries.length,
    prayerRequests: data.prayerRequests.length,
    gratitudes: data.gratitudes.length,
    faithfulnessMoments: data.faithfulnessMoments.length,
    lessons: data.lessons.length,
    revelations: data.revelations.length,
    tags: data.tags.length,
    entryTags: data.entryTags.length,
  };

  const total =
    counts.journalEntries +
    counts.prayerRequests +
    counts.gratitudes +
    counts.faithfulnessMoments +
    counts.lessons +
    counts.revelations +
    counts.tags;

  if (total === 0) {
    return {
      ok: false,
      error: "This export doesn't contain any entries to import.",
    };
  }

  return { ok: true, data, counts };
}
