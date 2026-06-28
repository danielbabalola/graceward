import { describe, expect, it } from "vitest";
import {
  escapeLikeTerm,
  hasActiveFilter,
  isLocalDateInRange,
  likeContainsParam,
  normalizeRange,
  normalizeSearch,
  presetDateRange,
  toLocalDay,
} from "@/lib/entry-filter";

describe("presetDateRange", () => {
  const now = new Date(2026, 5, 25); // 25 Jun 2026, local

  it("runs 'month' from the first of the month through today", () => {
    expect(presetDateRange("month", now)).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-25",
    });
  });

  it("runs 'year' from Jan 1 through today", () => {
    expect(presetDateRange("year", now)).toEqual({
      startDate: "2026-01-01",
      endDate: "2026-06-25",
    });
  });

  it("returns an open range for 'all' and 'custom'", () => {
    expect(presetDateRange("all", now)).toEqual({
      startDate: null,
      endDate: null,
    });
    expect(presetDateRange("custom", now)).toEqual({
      startDate: null,
      endDate: null,
    });
  });
});

describe("normalizeRange", () => {
  it("swaps reversed bounds", () => {
    expect(
      normalizeRange({ startDate: "2026-06-10", endDate: "2026-06-01" }),
    ).toEqual({ startDate: "2026-06-01", endDate: "2026-06-10" });
  });

  it("leaves correctly-ordered or open ranges untouched", () => {
    expect(
      normalizeRange({ startDate: "2026-06-01", endDate: "2026-06-10" }),
    ).toEqual({ startDate: "2026-06-01", endDate: "2026-06-10" });
    expect(normalizeRange({ startDate: null, endDate: "2026-06-10" })).toEqual({
      startDate: null,
      endDate: "2026-06-10",
    });
  });
});

describe("toLocalDay", () => {
  it("passes through date-only values unchanged", () => {
    expect(toLocalDay("2026-06-25")).toBe("2026-06-25");
  });

  it("converts an ISO timestamp to its local calendar day", () => {
    // Build an ISO instant from a known local day so the assertion is
    // timezone-independent: the local day must round-trip.
    const localNoon = new Date(2026, 5, 25, 12, 0, 0);
    expect(toLocalDay(localNoon.toISOString())).toBe("2026-06-25");
  });
});

describe("isLocalDateInRange", () => {
  it("matches everything for an open range", () => {
    expect(
      isLocalDateInRange("2026-06-25", { startDate: null, endDate: null }),
    ).toBe(true);
  });

  it("respects an inclusive lower bound", () => {
    const range = { startDate: "2026-06-10", endDate: null };
    expect(isLocalDateInRange("2026-06-10", range)).toBe(true);
    expect(isLocalDateInRange("2026-06-09", range)).toBe(false);
    expect(isLocalDateInRange("2026-06-11", range)).toBe(true);
  });

  it("respects an inclusive upper bound", () => {
    const range = { startDate: null, endDate: "2026-06-20" };
    expect(isLocalDateInRange("2026-06-20", range)).toBe(true);
    expect(isLocalDateInRange("2026-06-21", range)).toBe(false);
  });

  it("matches inside a closed range and excludes outside it", () => {
    const range = { startDate: "2026-06-01", endDate: "2026-06-30" };
    expect(isLocalDateInRange("2026-06-15", range)).toBe(true);
    expect(isLocalDateInRange("2026-05-31", range)).toBe(false);
    expect(isLocalDateInRange("2026-07-01", range)).toBe(false);
  });

  it("normalizes reversed bounds before comparing", () => {
    const range = { startDate: "2026-06-30", endDate: "2026-06-01" };
    expect(isLocalDateInRange("2026-06-15", range)).toBe(true);
  });
});

describe("normalizeSearch", () => {
  it("trims and nulls empty input", () => {
    expect(normalizeSearch("  hello  ")).toBe("hello");
    expect(normalizeSearch("   ")).toBeNull();
    expect(normalizeSearch("")).toBeNull();
    expect(normalizeSearch(null)).toBeNull();
    expect(normalizeSearch(undefined)).toBeNull();
  });
});

describe("escapeLikeTerm / likeContainsParam", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLikeTerm("50% off")).toBe("50\\% off");
    expect(escapeLikeTerm("a_b")).toBe("a\\_b");
    expect(escapeLikeTerm("c\\d")).toBe("c\\\\d");
  });

  it("wraps the escaped term in contains wildcards", () => {
    expect(likeContainsParam("grace")).toBe("%grace%");
    expect(likeContainsParam("100%")).toBe("%100\\%%");
  });
});

describe("hasActiveFilter", () => {
  it("is false for an empty filter", () => {
    expect(hasActiveFilter({})).toBe(false);
    expect(
      hasActiveFilter({ search: "   ", startDate: null, endDate: null }),
    ).toBe(false);
  });

  it("is true when any criterion is set", () => {
    expect(hasActiveFilter({ search: "joy" })).toBe(true);
    expect(hasActiveFilter({ startDate: "2026-06-01" })).toBe(true);
    expect(hasActiveFilter({ endDate: "2026-06-30" })).toBe(true);
  });
});
