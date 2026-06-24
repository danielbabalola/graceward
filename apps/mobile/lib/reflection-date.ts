import { isFutureLocalDate, toLocalDateString } from "@/lib/db";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** True when `dateString` is a real calendar date (rejects e.g. 2026-02-31). */
function isRealCalendarDate(dateString: string): boolean {
  const [year, month, day] = dateString.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

/**
 * Validates an `entryDate` route param. Returns a clean, non-future YYYY-MM-DD
 * value, or null when the param is missing, malformed, not a real date, or in
 * the future. Mirrors the repository-level future-date guard so the UI never
 * pre-selects a date the database would reject.
 */
export function parseEntryDateParam(
  value: string | string[] | undefined,
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !DATE_ONLY.test(raw) || !isRealCalendarDate(raw)) {
    return null;
  }
  if (isFutureLocalDate(raw)) {
    return null;
  }
  return raw;
}

/**
 * Resolves the initial reflection date from a route param, defaulting to today
 * when the param is absent or invalid.
 */
export function resolveInitialEntryDate(
  value: string | string[] | undefined,
): string {
  return parseEntryDateParam(value) ?? toLocalDateString(new Date());
}

/**
 * Builds the `params` object used to forward a validated entry date through the
 * reflection flow. Returns an empty object when there is no valid date, so the
 * downstream screen simply defaults to today.
 */
export function entryDateForwardParams(
  value: string | string[] | undefined,
): { entryDate: string } | Record<string, never> {
  const parsed = parseEntryDateParam(value);
  return parsed ? { entryDate: parsed } : {};
}
