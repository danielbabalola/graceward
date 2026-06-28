import { toLocalDateString } from "@/lib/db/helpers";

/**
 * Search + date-range filtering for the long "remember" lists (gratitude,
 * lessons, …). Pure and Expo-free so the date math and SQL-escaping can be
 * unit-tested without a database or React Native.
 */

/** Quick-pick spans plus a user-defined custom range. */
export type DateRangePreset = "all" | "month" | "year" | "custom";

/** An inclusive local date range. `null` on a bound means "open" on that side. */
export type DateRange = {
  /** Inclusive start day as YYYY-MM-DD, or null for no lower bound. */
  startDate: string | null;
  /** Inclusive end day as YYYY-MM-DD, or null for no upper bound. */
  endDate: string | null;
};

/** The "no date filter" range. */
export const EMPTY_RANGE: DateRange = { startDate: null, endDate: null };

/**
 * Text search passed down to a list's database query. Date filtering is applied
 * in memory (see `isLocalDateInRange`) so it can use each entry's effective
 * local day — the user-set "occurred" day when present, else the record date —
 * which a SQL query over a mix of date-only and UTC timestamps cannot.
 */
export type EntrySearch = {
  /** Case-insensitive substring matched against the entry's text. */
  search?: string | null;
};

/** The combined filter state a list screen holds: search box + date range. */
export type ListFilterState = EntrySearch & Partial<DateRange>;

/** True when any part of the filter would narrow the results. */
export function hasActiveFilter(filter: ListFilterState): boolean {
  return Boolean(
    normalizeSearch(filter.search) || filter.startDate || filter.endDate,
  );
}

/**
 * The local calendar range for a preset, anchored to `now` (defaults to today).
 * "This month"/"This year" run from the first day of the period through today;
 * "all" and "custom" return an open range (the caller supplies custom dates).
 */
export function presetDateRange(
  preset: DateRangePreset,
  now: Date = new Date(),
): DateRange {
  const today = toLocalDateString(now);
  switch (preset) {
    case "month":
      return {
        startDate: toLocalDateString(
          new Date(now.getFullYear(), now.getMonth(), 1),
        ),
        endDate: today,
      };
    case "year":
      return {
        startDate: toLocalDateString(new Date(now.getFullYear(), 0, 1)),
        endDate: today,
      };
    case "all":
    case "custom":
    default:
      return { ...EMPTY_RANGE };
  }
}

/** Ensures a range reads start ≤ end, swapping the bounds if a user picked them out of order. */
export function normalizeRange(range: DateRange): DateRange {
  const { startDate, endDate } = range;
  if (startDate && endDate && startDate > endDate) {
    return { startDate: endDate, endDate: startDate };
  }
  return { startDate, endDate };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The local calendar day (YYYY-MM-DD) for a value that may be a date-only string
 * (already a local day, e.g. a user-set "occurred" date) or an ISO timestamp
 * (converted from UTC to the device's local day). Mirrors how dates are shown
 * and grouped, so filtering and display always agree.
 */
export function toLocalDay(value: string): string {
  if (DATE_ONLY.test(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return toLocalDateString(date);
}

/**
 * True when a date value's local day falls within an inclusive range. An open
 * bound (null) means unbounded on that side; an empty range matches everything.
 * ISO date strings sort the same lexically as chronologically, so the bounds
 * are compared as plain strings.
 */
export function isLocalDateInRange(value: string, range: DateRange): boolean {
  const { startDate, endDate } = normalizeRange(range);
  if (!startDate && !endDate) {
    return true;
  }
  const day = toLocalDay(value);
  if (startDate && day < startDate) {
    return false;
  }
  if (endDate && day > endDate) {
    return false;
  }
  return true;
}

/** Trims a search box value; empty/whitespace becomes null (meaning "no search"). */
export function normalizeSearch(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

const LIKE_SPECIAL = /[\\%_]/g;

/**
 * Escapes the SQL LIKE wildcards (`%`, `_`) and the escape char itself so a
 * user's literal text is matched verbatim. Pair with `ESCAPE '\'` in the query.
 */
export function escapeLikeTerm(term: string): string {
  return term.replace(LIKE_SPECIAL, (char) => `\\${char}`);
}

/** Builds the `%term%` bound parameter for a contains-style LIKE search. */
export function likeContainsParam(term: string): string {
  return `%${escapeLikeTerm(term)}%`;
}
