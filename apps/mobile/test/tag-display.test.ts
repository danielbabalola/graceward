import { describe, expect, it } from "vitest";
import type { Tag } from "@graceward/shared";
import { collectDistinctTags } from "@/lib/tag-display";

function makeTag(id: string, name: string): Tag {
  return {
    id,
    name,
    slug: name.toLowerCase(),
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
  };
}

describe("collectDistinctTags", () => {
  it("returns an empty list for an empty map", () => {
    expect(collectDistinctTags(new Map())).toEqual([]);
  });

  it("flattens, de-duplicates by id, and sorts by name", () => {
    const family = makeTag("t1", "Family");
    const trust = makeTag("t2", "Trust");
    const provision = makeTag("t3", "Provision");
    const map = new Map<string, Tag[]>([
      ["e1", [trust, family]],
      ["e2", [family, provision]],
    ]);

    const result = collectDistinctTags(map);
    expect(result.map((tag) => tag.id)).toEqual(["t1", "t3", "t2"]);
  });

  it("sorts case-insensitively", () => {
    const map = new Map<string, Tag[]>([
      ["e1", [makeTag("t1", "zeal"), makeTag("t2", "Awe")]],
    ]);
    expect(collectDistinctTags(map).map((tag) => tag.name)).toEqual([
      "Awe",
      "zeal",
    ]);
  });
});
