import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createInMemoryQuotaStore,
  type InstallUsage,
} from "../src/ai/quota-store.js";
import {
  createQuotaService,
  emptyUsage,
  evaluateQuota,
  resolveQuotaConfig,
  secondsUntilNextUtcMidnight,
  totalCount,
  usageForToday,
  utcDay,
  type QuotaConfig,
} from "../src/ai/quota.js";

const config: QuotaConfig = {
  total: 5,
  analyze: 3,
  transcribe: 2,
  structure: 2,
};

describe("usageForToday (daily reset)", () => {
  it("returns a zeroed record when nothing is stored", () => {
    expect(usageForToday(undefined, "2026-06-24")).toEqual(
      emptyUsage("2026-06-24"),
    );
  });

  it("returns the stored record when it belongs to today", () => {
    const stored: InstallUsage = {
      day: "2026-06-24",
      analyze: 2,
      transcribe: 1,
      structure: 0,
    };
    expect(usageForToday(stored, "2026-06-24")).toBe(stored);
  });

  it("resets to zero when the stored record is from a previous day", () => {
    const stored: InstallUsage = {
      day: "2026-06-23",
      analyze: 3,
      transcribe: 2,
      structure: 2,
    };
    expect(usageForToday(stored, "2026-06-24")).toEqual(
      emptyUsage("2026-06-24"),
    );
  });
});

describe("evaluateQuota", () => {
  it("allows usage under both the kind cap and total cap", () => {
    const usage: InstallUsage = {
      day: "2026-06-24",
      analyze: 1,
      transcribe: 0,
      structure: 0,
    };
    expect(evaluateQuota(usage, config, "analyze")).toEqual({ allowed: true });
  });

  it("blocks on the per-kind cap", () => {
    const usage: InstallUsage = {
      day: "2026-06-24",
      analyze: 0,
      transcribe: 2,
      structure: 0,
    };
    expect(evaluateQuota(usage, config, "transcribe")).toEqual({
      allowed: false,
      reason: "kind",
    });
  });

  it("blocks on the combined total cap even when a kind is under its cap", () => {
    const usage: InstallUsage = {
      day: "2026-06-24",
      analyze: 3,
      transcribe: 2,
      structure: 0,
    };
    expect(totalCount(usage)).toBe(5);
    // structure is at 0/2 but total is 5/5 → blocked by total.
    expect(evaluateQuota(usage, config, "structure")).toEqual({
      allowed: false,
      reason: "total",
    });
  });

  it("treats a zero cap as an explicit freeze (blocks immediately)", () => {
    const frozen: QuotaConfig = { ...config, analyze: 0 };
    expect(evaluateQuota(emptyUsage("2026-06-24"), frozen, "analyze")).toEqual({
      allowed: false,
      reason: "kind",
    });
  });
});

describe("secondsUntilNextUtcMidnight", () => {
  it("returns time remaining until the next UTC midnight", () => {
    const now = new Date("2026-06-24T23:59:30.000Z");
    expect(secondsUntilNextUtcMidnight(now)).toBe(30);
  });

  it("is always at least one second", () => {
    const now = new Date("2026-06-24T00:00:00.000Z");
    expect(secondsUntilNextUtcMidnight(now)).toBeGreaterThanOrEqual(1);
  });
});

describe("utcDay", () => {
  it("formats the UTC calendar day", () => {
    expect(utcDay(new Date("2026-06-24T23:00:00.000Z"))).toBe("2026-06-24");
  });
});

describe("createQuotaService", () => {
  it("counts only via record(), and blocks once a kind cap is reached", () => {
    let now = new Date("2026-06-24T08:00:00.000Z");
    const service = createQuotaService(
      createInMemoryQuotaStore(),
      config,
      () => now,
    );
    const id = "install-a";

    // check() never increments: repeated checks stay allowed.
    expect(service.check(id, "transcribe").allowed).toBe(true);
    expect(service.check(id, "transcribe").allowed).toBe(true);

    service.record(id, "transcribe");
    service.record(id, "transcribe");
    const blocked = service.check(id, "transcribe");
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("kind");
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // A different install is unaffected.
    expect(service.check("install-b", "transcribe").allowed).toBe(true);

    // The combined total cap also blocks other kinds for the same install.
    service.record(id, "analyze");
    service.record(id, "analyze");
    service.record(id, "analyze");
    // total now 5 (2 transcribe + 3 analyze) → structure blocked by total.
    expect(service.check(id, "structure")).toMatchObject({
      allowed: false,
      reason: "total",
    });

    // Advancing to the next UTC day resets the quota.
    now = new Date("2026-06-25T00:00:01.000Z");
    expect(service.check(id, "transcribe").allowed).toBe(true);
    expect(service.check(id, "structure").allowed).toBe(true);
  });
});

describe("resolveQuotaConfig", () => {
  const KEYS = [
    "AI_DAILY_TOTAL_QUOTA_PER_INSTALL",
    "AI_DAILY_ANALYZE_QUOTA_PER_INSTALL",
    "AI_DAILY_TRANSCRIBE_QUOTA_PER_INSTALL",
    "AI_DAILY_STRUCTURE_QUOTA_PER_INSTALL",
  ] as const;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      const value = saved[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("uses conservative defaults when unset", () => {
    expect(resolveQuotaConfig()).toEqual({
      total: 40,
      analyze: 30,
      transcribe: 15,
      structure: 15,
    });
  });

  it("reads integer overrides, allowing 0 as a freeze", () => {
    process.env.AI_DAILY_TOTAL_QUOTA_PER_INSTALL = "10";
    process.env.AI_DAILY_ANALYZE_QUOTA_PER_INSTALL = "0";
    expect(resolveQuotaConfig()).toMatchObject({ total: 10, analyze: 0 });
  });

  it("falls back to defaults for invalid (negative/non-numeric) values", () => {
    process.env.AI_DAILY_TRANSCRIBE_QUOTA_PER_INSTALL = "-3";
    process.env.AI_DAILY_STRUCTURE_QUOTA_PER_INSTALL = "abc";
    expect(resolveQuotaConfig()).toMatchObject({
      transcribe: 15,
      structure: 15,
    });
  });
});
