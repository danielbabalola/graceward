import { describe, expect, it } from "vitest";
import {
  effectiveEntryDate,
  groupEntriesByMonth,
} from "@/lib/entry-grouping";

describe("effectiveEntryDate", () => {
  it("prefers the occurred day when present", () => {
    expect(
      effectiveEntryDate({ occurredAt: "2026-05-10", createdAt: "2026-06-01" }),
    ).toBe("2026-05-10");
  });

  it("falls back to the record date otherwise", () => {
    expect(effectiveEntryDate({ createdAt: "2026-06-01" })).toBe("2026-06-01");
    expect(
      effectiveEntryDate({ occurredAt: null, createdAt: "2026-06-01" }),
    ).toBe("2026-06-01");
  });
});

describe("groupEntriesByMonth", () => {
  it("groups consecutive entries into month sections, preserving order", () => {
    const entries = [
      { id: "a", createdAt: "2026-06-25" },
      { id: "b", createdAt: "2026-06-02" },
      { id: "c", createdAt: "2026-05-30" },
      { id: "d", createdAt: "2026-05-01" },
    ];

    const sections = groupEntriesByMonth(entries);

    expect(sections.map((s) => s.key)).toEqual(["2026-06", "2026-05"]);
    expect(sections[0]!.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(sections[1]!.items.map((i) => i.id)).toEqual(["c", "d"]);
    // Titles are locale-formatted but always include the year.
    expect(sections[0]!.title).toContain("2026");
  });

  it("buckets by the occurred day when set", () => {
    const sections = groupEntriesByMonth([
      { id: "a", occurredAt: "2026-04-15", createdAt: "2026-06-01" },
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.key).toBe("2026-04");
  });

  it("returns no sections for an empty list", () => {
    expect(groupEntriesByMonth([])).toEqual([]);
  });
});
