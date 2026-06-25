import type { StructureTextEntryResponse } from "@graceward/ai-schemas";
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

/**
 * Merges newly suggested tag names into an existing list without duplicating.
 * Existing tags (and their order) are kept first; suggested ones are appended
 * only when not already present, compared case-insensitively on the trimmed
 * name. Used when applying AI-suggested tags so a user's own tags are never
 * dropped — matching the "Add" affordance shown for the suggestion.
 */
export function mergeTagNames(
  existing: string[],
  added: string[],
): string[] {
  const result = [...existing];
  const seen = new Set(existing.map((tag) => tag.trim().toLowerCase()));
  for (const tag of added) {
    const key = tag.trim().toLowerCase();
    if (key.length > 0 && !seen.has(key)) {
      seen.add(key);
      result.push(tag);
    }
  }
  return result;
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

/**
 * A polish result normalized into the pieces a form can apply independently.
 * Each field is what Graceward suggested for one part of the entry; `null` means
 * there is nothing to offer for that part (e.g. gratitude has no title, a prayer
 * with no description, or no safe date was stated). The user chooses which of
 * these to apply, so their own words are never overwritten wholesale.
 */
export type PolishApplicableFields = {
  /** Suggested title/name, or null for entry types without a title field. */
  title: string | null;
  /** Suggested tidied content/details, or null when none was produced. */
  content: string | null;
  /** Suggested tags (may be empty). */
  tags: string[];
  /**
   * A safe, non-past suggested date (a prayer follow-up or an instruction's
   * "by when"), already validated by {@link safeFollowUpDate}; null otherwise.
   */
  date: string | null;
};

/**
 * Normalizes a "Polish with AI" result into the discrete pieces a create form
 * can apply one at a time. The per-type field differences (prayer's
 * description/follow-up, instruction's due date, the title-less gratitude and
 * faithfulness shapes) are resolved here so the UI stays generic. Any suggested
 * date is passed through {@link safeFollowUpDate} so an inferred or past date is
 * never surfaced.
 */
export function polishApplicableFields(
  result: StructureTextEntryResponse,
): PolishApplicableFields {
  const tags = suggestionTags(result.fields);
  switch (result.entryType) {
    case "prayer": {
      const description = (result.fields.description ?? "").trim();
      return {
        title: result.fields.title,
        content: description.length > 0 ? description : null,
        tags,
        date: safeFollowUpDate(result.fields.followUpAt),
      };
    }
    case "gratitude":
    case "faithfulness":
      return { title: null, content: result.fields.content, tags, date: null };
    case "lesson":
    case "dream":
    case "prophecy":
      return {
        title: result.fields.title,
        content: result.fields.content,
        tags,
        date: null,
      };
    case "instruction":
      return {
        title: result.fields.title,
        content: result.fields.content,
        tags,
        date: safeFollowUpDate(result.fields.dueAt),
      };
  }
}
