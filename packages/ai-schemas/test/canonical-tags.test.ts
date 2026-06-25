import { describe, expect, it } from "vitest";
import { CANONICAL_TAGS, MAX_TAGS_PER_ENTRY } from "../src/index.js";

/** Mirrors lib/tag-normalize's slug rule so the constant stays dedupe-safe. */
function slug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

describe("CANONICAL_TAGS", () => {
  it("is a non-empty, reasonably small seed list", () => {
    expect(CANONICAL_TAGS.length).toBeGreaterThan(0);
    expect(CANONICAL_TAGS.length).toBeLessThanOrEqual(30);
  });

  it("has no blank entries and no duplicates by normalized slug", () => {
    const slugs = CANONICAL_TAGS.map(slug);
    for (const name of CANONICAL_TAGS) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(slugs).size).toBe(CANONICAL_TAGS.length);
  });

  it("uses short, reusable single words (no commas)", () => {
    for (const name of CANONICAL_TAGS) {
      expect(name).not.toContain(",");
      expect(name.length).toBeLessThanOrEqual(20);
    }
  });

  it("keeps the per-entry tag cap a positive bound", () => {
    expect(MAX_TAGS_PER_ENTRY).toBeGreaterThan(0);
  });
});
