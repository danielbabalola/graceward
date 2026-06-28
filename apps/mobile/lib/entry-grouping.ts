/**
 * Groups long entry lists into month sections for scannable, date-based
 * browsing. Pure and Expo-free so it can be unit-tested directly.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A list entry that carries a record date and an optional "when it happened" day. */
export type DatedEntry = {
  /** User-set day the thing happened (YYYY-MM-DD). Absent on gratitude/lessons. */
  occurredAt?: string | null;
  /** ISO timestamp of when the entry was recorded. */
  createdAt: string;
};

/** One month's worth of entries, in the order they were given. */
export type EntrySection<T> = {
  /** Stable `YYYY-MM` key for React lists. */
  key: string;
  /** Human label, e.g. "June 2026". */
  title: string;
  items: T[];
};

/**
 * The date an entry should be filed under: the user-set "when it happened" day
 * when present, otherwise the record date. Gratitude and lessons have no
 * occurred date, so this resolves to `createdAt` for them.
 */
export function effectiveEntryDate(entry: DatedEntry): string {
  return entry.occurredAt ?? entry.createdAt;
}

function parseLocal(value: string): Date {
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value);
}

/** Local `YYYY-MM` bucket for a date-only or ISO value. */
function monthKey(value: string): string {
  const date = parseLocal(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthTitle(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) {
    return key;
  }
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/**
 * Splits entries (assumed already sorted newest-first) into consecutive month
 * sections, preserving the incoming order within each section.
 */
export function groupEntriesByMonth<T extends DatedEntry>(
  entries: T[],
): EntrySection<T>[] {
  const sections: EntrySection<T>[] = [];
  let current: EntrySection<T> | null = null;

  for (const entry of entries) {
    const key = monthKey(effectiveEntryDate(entry));
    if (!current || current.key !== key) {
      current = { key, title: monthTitle(key), items: [] };
      sections.push(current);
    }
    current.items.push(entry);
  }

  return sections;
}
