import { describe, expect, it } from "vitest";
import {
  hasTypedEntryContent,
  safeFollowUpDate,
  suggestionTags,
} from "@/lib/voice-entry-fields";

describe("hasTypedEntryContent", () => {
  it("is false for an empty form", () => {
    expect(hasTypedEntryContent([])).toBe(false);
    expect(hasTypedEntryContent(["", "", ""])).toBe(false);
    expect(hasTypedEntryContent([null, undefined])).toBe(false);
  });

  it("ignores whitespace-only values", () => {
    expect(hasTypedEntryContent(["   ", "\n\t"])).toBe(false);
  });

  it("is true when any field has real content", () => {
    expect(hasTypedEntryContent(["", "Rest well"])).toBe(true);
    expect(hasTypedEntryContent(["Grateful", null])).toBe(true);
    expect(hasTypedEntryContent([" trimmed "])).toBe(true);
  });
});

describe("safeFollowUpDate", () => {
  const today = "2026-06-24";

  it("returns null when nothing was spoken", () => {
    expect(safeFollowUpDate(null, today)).toBeNull();
    expect(safeFollowUpDate(undefined, today)).toBeNull();
    expect(safeFollowUpDate("", today)).toBeNull();
  });

  it("keeps today and future calendar dates", () => {
    expect(safeFollowUpDate("2026-06-24", today)).toBe("2026-06-24");
    expect(safeFollowUpDate("2026-06-29", today)).toBe("2026-06-29");
    expect(safeFollowUpDate("2027-01-01", today)).toBe("2027-01-01");
  });

  it("drops past dates (never sets a follow-up in the past)", () => {
    expect(safeFollowUpDate("2026-06-23", today)).toBeNull();
    expect(safeFollowUpDate("2020-01-01", today)).toBeNull();
  });

  it("drops malformed or non-date strings", () => {
    expect(safeFollowUpDate("soon", today)).toBeNull();
    expect(safeFollowUpDate("next Monday", today)).toBeNull();
    expect(safeFollowUpDate("2026/06/29", today)).toBeNull();
    expect(safeFollowUpDate("06-29-2026", today)).toBeNull();
  });

  it("drops impossible calendar dates", () => {
    expect(safeFollowUpDate("2026-02-31", today)).toBeNull();
    expect(safeFollowUpDate("2026-13-01", today)).toBeNull();
  });

  it("trims surrounding whitespace before validating", () => {
    expect(safeFollowUpDate("  2026-06-29  ", today)).toBe("2026-06-29");
  });
});

describe("suggestionTags", () => {
  it("prefers the unified tags array when present", () => {
    expect(suggestionTags({ tags: ["Family", "Provision"] })).toEqual([
      "Family",
      "Provision",
    ]);
  });

  it("falls back to a legacy single field when no tags array", () => {
    expect(suggestionTags({ category: "Health" })).toEqual(["Health"]);
    expect(suggestionTags({ theme: "Trust" })).toEqual(["Trust"]);
    expect(suggestionTags({ faithfulnessTheme: "Healing" })).toEqual([
      "Healing",
    ]);
  });

  it("returns an empty array when nothing is present", () => {
    expect(suggestionTags({})).toEqual([]);
    expect(suggestionTags({ tags: [] })).toEqual([]);
  });
});
