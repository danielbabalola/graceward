import { describe, expect, it } from "vitest";
import { planLegacyTagBackfill } from "@/lib/tag-backfill";

describe("planLegacyTagBackfill", () => {
  it("creates one tag and one link for a single labelled row", () => {
    const plan = planLegacyTagBackfill([
      { entryType: "gratitude", entryId: "g1", label: "Provision" },
    ]);
    expect(plan.tags).toEqual([{ slug: "provision", name: "Provision" }]);
    expect(plan.links).toEqual([
      { slug: "provision", entryType: "gratitude", entryId: "g1" },
    ]);
  });

  it("skips null and blank labels", () => {
    const plan = planLegacyTagBackfill([
      { entryType: "gratitude", entryId: "g1", label: null },
      { entryType: "win", entryId: "w1", label: "   " },
      { entryType: "lesson", entryId: "l1", label: "" },
    ]);
    expect(plan.tags).toEqual([]);
    expect(plan.links).toEqual([]);
  });

  it("dedupes tags across entry types by slug, first casing wins", () => {
    const plan = planLegacyTagBackfill([
      { entryType: "gratitude", entryId: "g1", label: "Provision" },
      { entryType: "win", entryId: "w1", label: "provision" },
      { entryType: "lesson", entryId: "l1", label: "PROVISION" },
    ]);
    expect(plan.tags).toEqual([{ slug: "provision", name: "Provision" }]);
    expect(plan.links).toHaveLength(3);
    expect(plan.links.every((link) => link.slug === "provision")).toBe(true);
  });

  it("normalizes internal whitespace in slug and name", () => {
    const plan = planLegacyTagBackfill([
      { entryType: "win", entryId: "w1", label: "  Answered   Prayer " },
    ]);
    expect(plan.tags).toEqual([
      { slug: "answered prayer", name: "Answered Prayer" },
    ]);
  });

  it("collapses duplicate (entry, slug) links but keeps distinct entries", () => {
    const plan = planLegacyTagBackfill([
      { entryType: "gratitude", entryId: "g1", label: "Family" },
      { entryType: "gratitude", entryId: "g1", label: "family" },
      { entryType: "gratitude", entryId: "g2", label: "Family" },
    ]);
    expect(plan.tags).toEqual([{ slug: "family", name: "Family" }]);
    expect(plan.links).toEqual([
      { slug: "family", entryType: "gratitude", entryId: "g1" },
      { slug: "family", entryType: "gratitude", entryId: "g2" },
    ]);
  });
});
