import type { Tag } from "@graceward/shared";

/**
 * Flattens a per-entry tag map into a single, de-duplicated, name-sorted list of
 * the distinct tags present — used to populate a list's tag filter bar.
 */
export function collectDistinctTags(map: Map<string, Tag[]>): Tag[] {
  const byId = new Map<string, Tag>();
  for (const tags of map.values()) {
    for (const tag of tags) {
      if (!byId.has(tag.id)) {
        byId.set(tag.id, tag);
      }
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}
