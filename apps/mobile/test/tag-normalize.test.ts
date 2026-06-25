import { describe, expect, it } from "vitest";
import {
  dedupeTagNames,
  diffEntryTagIds,
  normalizeTagName,
  normalizeTagSlug,
  sameTagNameSet,
} from "@/lib/tag-normalize";

describe("normalizeTagSlug", () => {
  it("lowercases, trims, and collapses internal whitespace", () => {
    expect(normalizeTagSlug("  Family ")).toBe("family");
    expect(normalizeTagSlug("Answered   Prayer")).toBe("answered prayer");
    expect(normalizeTagSlug("PROVISION")).toBe("provision");
  });

  it("treats case/spacing variants as the same slug", () => {
    expect(normalizeTagSlug("Family")).toBe(normalizeTagSlug("family"));
    expect(normalizeTagSlug("answered prayer")).toBe(
      normalizeTagSlug("Answered  Prayer"),
    );
  });
});

describe("normalizeTagName", () => {
  it("preserves casing but trims and collapses whitespace", () => {
    expect(normalizeTagName("  Family ")).toBe("Family");
    expect(normalizeTagName("Answered   Prayer")).toBe("Answered Prayer");
  });
});

describe("dedupeTagNames", () => {
  it("drops blanks and whitespace-only entries", () => {
    expect(dedupeTagNames(["Family", "", "   ", "Provision"])).toEqual([
      "Family",
      "Provision",
    ]);
  });

  it("dedupes case/spacing-insensitively, keeping the first casing", () => {
    expect(dedupeTagNames(["Family", "family", "FAMILY"])).toEqual(["Family"]);
    expect(dedupeTagNames(["Answered Prayer", "answered  prayer"])).toEqual([
      "Answered Prayer",
    ]);
  });

  it("preserves order of first appearance", () => {
    expect(dedupeTagNames(["Trust", "Family", "trust", "Provision"])).toEqual([
      "Trust",
      "Family",
      "Provision",
    ]);
  });
});

describe("sameTagNameSet", () => {
  it("is true regardless of order, case, or spacing", () => {
    expect(sameTagNameSet(["Family", "Trust"], ["trust", "FAMILY"])).toBe(true);
    expect(sameTagNameSet(["Answered Prayer"], ["answered  prayer"])).toBe(true);
  });

  it("ignores blanks and duplicates", () => {
    expect(sameTagNameSet(["Family", "", "family"], ["Family"])).toBe(true);
  });

  it("is false when the sets differ", () => {
    expect(sameTagNameSet(["Family"], ["Family", "Trust"])).toBe(false);
    expect(sameTagNameSet(["Family"], ["Provision"])).toBe(false);
    expect(sameTagNameSet([], ["Family"])).toBe(false);
  });

  it("is true for two empty lists", () => {
    expect(sameTagNameSet([], [])).toBe(true);
    expect(sameTagNameSet(["", "  "], [])).toBe(true);
  });
});

describe("diffEntryTagIds (setEntryTags diffing)", () => {
  it("adds desired ids that are not currently linked", () => {
    expect(diffEntryTagIds([], ["a", "b"])).toEqual({
      toAdd: ["a", "b"],
      toRemove: [],
    });
  });

  it("removes current ids that are no longer desired", () => {
    expect(diffEntryTagIds(["a", "b"], [])).toEqual({
      toAdd: [],
      toRemove: ["a", "b"],
    });
  });

  it("leaves shared ids untouched and only diffs the edges", () => {
    expect(diffEntryTagIds(["a", "b", "c"], ["b", "c", "d"])).toEqual({
      toAdd: ["d"],
      toRemove: ["a"],
    });
  });

  it("is a no-op when current and desired match", () => {
    expect(diffEntryTagIds(["a", "b"], ["b", "a"])).toEqual({
      toAdd: [],
      toRemove: [],
    });
  });
});
