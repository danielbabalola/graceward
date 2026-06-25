/**
 * Self-contained normalization mirroring normalizeTagSlug/normalizeTagName in
 * lib/tag-normalize.ts. Intentionally NOT imported from there so the migration
 * backfill that depends on this module stays frozen and independent of the
 * evolving runtime tag layer.
 */
function backfillSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function backfillName(label: string | null): string {
  return (label ?? "").trim().replace(/\s+/g, " ");
}

/** A legacy single-label value read from a pre-tag column, with its owner. */
export type LegacyLabelRow = {
  entryType: string;
  entryId: string;
  label: string | null;
};

/** A distinct tag to create, keyed by slug (display name is first-seen casing). */
export type PlannedTag = { slug: string; name: string };

/** A link to create between a planned tag (by slug) and an entry. */
export type PlannedLink = { slug: string; entryType: string; entryId: string };

export type BackfillPlan = { tags: PlannedTag[]; links: PlannedLink[] };

/**
 * Pure core of the v10 migration backfill: turns legacy category/theme/
 * faithfulness_theme rows into the distinct tags to create and the entry_tags
 * links to insert. Blanks are skipped, tags are deduped by slug (first casing
 * wins), and duplicate (slug, entry) links are collapsed. The migration layer
 * is left to assign ids and run the inserts; keeping this pure makes the
 * derivation rule testable without a database.
 */
export function planLegacyTagBackfill(rows: LegacyLabelRow[]): BackfillPlan {
  const tagsBySlug = new Map<string, PlannedTag>();
  const links: PlannedLink[] = [];
  const seenLinks = new Set<string>();

  for (const row of rows) {
    const name = backfillName(row.label);
    if (!name) {
      continue;
    }
    const slug = backfillSlug(name);
    if (!tagsBySlug.has(slug)) {
      tagsBySlug.set(slug, { slug, name });
    }
    const linkKey = `${row.entryType}\u0000${row.entryId}\u0000${slug}`;
    if (seenLinks.has(linkKey)) {
      continue;
    }
    seenLinks.add(linkKey);
    links.push({ slug, entryType: row.entryType, entryId: row.entryId });
  }

  return { tags: [...tagsBySlug.values()], links };
}
