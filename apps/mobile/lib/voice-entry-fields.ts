import { toLocalDateString } from "@/lib/db/helpers";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when the user has already typed something into an entry's fields. Used
 * to decide whether speaking should ask before replacing what's there. Blank
 * or whitespace-only values do not count as content, so an untouched form never
 * triggers a "replace?" prompt.
 */
export function hasTypedEntryContent(
  values: ReadonlyArray<string | null | undefined>,
): boolean {
  return values.some((value) => (value ?? "").trim().length > 0);
}

/**
 * Extracts the suggested tag names from a structured AI suggestion's fields.
 * Prefers the unified `tags` array, falling back to the deprecated single
 * category/theme/faithfulnessTheme field so older provider responses still map.
 */
export function suggestionTags(fields: {
  tags?: string[];
  category?: string | null;
  theme?: string | null;
  faithfulnessTheme?: string | null;
}): string[] {
  if (Array.isArray(fields.tags) && fields.tags.length > 0) {
    return fields.tags;
  }
  const legacy = fields.category ?? fields.theme ?? fields.faithfulnessTheme;
  return legacy ? [legacy] : [];
}

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
 * Defense-in-depth for a voice-structured prayer follow-up date. The structuring
 * prompt already forbids inferring a follow-up, guessing vague times, or setting
 * a past date — but the model is untrusted, so the client never surfaces a
 * follow-up that isn't a real, non-past calendar date. Returns the clean
 * YYYY-MM-DD value only when it is today or later; otherwise null (leave blank).
 * "Today" is allowed because the follow-up date selector permits today.
 */
export function safeFollowUpDate(
  value: string | null | undefined,
  today: string = toLocalDateString(new Date()),
): string | null {
  if (!value) {
    return null;
  }
  const raw = value.trim();
  if (!DATE_ONLY.test(raw) || !isRealCalendarDate(raw)) {
    return null;
  }
  // ISO date strings compare lexically the same as chronologically, so a past
  // date is simply one that sorts before today.
  if (raw < today) {
    return null;
  }
  return raw;
}
