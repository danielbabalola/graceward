/**
 * Pure tag-name helpers with no database dependency, so they can be unit-tested
 * and reused without pulling in expo-sqlite. The DB layer (lib/db/tags.ts)
 * re-exports these.
 */

/**
 * Normalizes a tag name into its dedupe slug: trimmed, lowercased, with all
 * internal whitespace collapsed to a single space. Two names that differ only
 * by case or spacing resolve to the same tag.
 */
export function normalizeTagSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Cleans a tag name for storage/display: trimmed, internal whitespace single. */
export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Reduces a raw list of names to the distinct, display-ready names (first
 * casing wins), dropping blanks and case/spacing duplicates. Preserves order.
 */
export function dedupeTagNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = normalizeTagName(raw);
    if (!name) {
      continue;
    }
    const slug = normalizeTagSlug(name);
    if (seen.has(slug)) {
      continue;
    }
    seen.add(slug);
    result.push(name);
  }
  return result;
}

/**
 * Diffs the currently-linked tag ids against the desired set, returning which
 * links to add and which to remove. Pure set math, extracted from
 * `setEntryTags` so the diffing rule can be unit-tested without a database.
 * `toRemove` are current ids absent from desired; `toAdd` are desired ids
 * absent from current; ids in both are left alone (preserved). Order follows
 * the `current`/`desired` inputs respectively.
 */
export function diffEntryTagIds(
  current: string[],
  desired: string[],
): { toAdd: string[]; toRemove: string[] } {
  const currentSet = new Set(current);
  const desiredSet = new Set(desired);
  const toRemove = current.filter((id) => !desiredSet.has(id));
  const toAdd = desired.filter((id) => !currentSet.has(id));
  return { toAdd, toRemove };
}

/**
 * True when two lists of tag names represent the same set, ignoring order and
 * case/spacing differences. Used by edit screens to detect unsaved changes.
 */
export function sameTagNameSet(a: string[], b: string[]): boolean {
  const setA = new Set(dedupeTagNames(a).map(normalizeTagSlug));
  const setB = new Set(dedupeTagNames(b).map(normalizeTagSlug));
  if (setA.size !== setB.size) {
    return false;
  }
  for (const slug of setA) {
    if (!setB.has(slug)) {
      return false;
    }
  }
  return true;
}
