import type { InstallUsage, QuotaStore } from "./quota-store.js";

/** The three paid AI actions a quota is tracked for, one per endpoint. */
export type QuotaKind = "analyze" | "transcribe" | "structure";

/** Per-install daily ceilings. A total cap spans all kinds combined. */
export type QuotaConfig = {
  total: number;
  analyze: number;
  transcribe: number;
  structure: number;
};

/**
 * Conservative closed-beta defaults. Small enough to bound per-install cost if a
 * single install loops or is shared, generous enough for genuine daily use.
 */
export const DEFAULT_QUOTA_CONFIG: QuotaConfig = {
  total: 40,
  analyze: 30,
  transcribe: 15,
  structure: 15,
};

/** Parses a non-negative integer env value; 0 is allowed (an explicit freeze). */
function resolveNonNegativeInt(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Reads per-install daily quotas from env, applying conservative defaults. */
export function resolveQuotaConfig(): QuotaConfig {
  return {
    total: resolveNonNegativeInt(
      process.env.AI_DAILY_TOTAL_QUOTA_PER_INSTALL,
      DEFAULT_QUOTA_CONFIG.total,
    ),
    analyze: resolveNonNegativeInt(
      process.env.AI_DAILY_ANALYZE_QUOTA_PER_INSTALL,
      DEFAULT_QUOTA_CONFIG.analyze,
    ),
    transcribe: resolveNonNegativeInt(
      process.env.AI_DAILY_TRANSCRIBE_QUOTA_PER_INSTALL,
      DEFAULT_QUOTA_CONFIG.transcribe,
    ),
    structure: resolveNonNegativeInt(
      process.env.AI_DAILY_STRUCTURE_QUOTA_PER_INSTALL,
      DEFAULT_QUOTA_CONFIG.structure,
    ),
  };
}

/** UTC calendar day (YYYY-MM-DD) for a given moment. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** A zeroed usage record for the given UTC day. */
export function emptyUsage(day: string): InstallUsage {
  return { day, analyze: 0, transcribe: 0, structure: 0 };
}

/**
 * Returns the stored usage if it belongs to `today`, otherwise a fresh zeroed
 * record for today. This is the daily reset: a stored record from a previous
 * UTC day is treated as empty (and overwritten on the next record()).
 */
export function usageForToday(
  stored: InstallUsage | undefined,
  today: string,
): InstallUsage {
  if (!stored || stored.day !== today) {
    return emptyUsage(today);
  }
  return stored;
}

/** Sum across all kinds for the total daily cap. */
export function totalCount(usage: InstallUsage): number {
  return usage.analyze + usage.transcribe + usage.structure;
}

export type QuotaDecision = {
  allowed: boolean;
  /** Which cap blocked the request, when not allowed. */
  reason?: "kind" | "total";
};

/**
 * Pure quota decision for today's usage. Blocks when the combined total cap is
 * reached, or when this kind's daily cap is reached. Never mutates input.
 */
export function evaluateQuota(
  usage: InstallUsage,
  config: QuotaConfig,
  kind: QuotaKind,
): QuotaDecision {
  if (totalCount(usage) >= config.total) {
    return { allowed: false, reason: "total" };
  }
  if (usage[kind] >= config[kind]) {
    return { allowed: false, reason: "kind" };
  }
  return { allowed: true };
}

/** Seconds from `now` until the next UTC midnight (when daily quotas reset). */
export function secondsUntilNextUtcMidnight(now: Date): number {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((nextMidnight - now.getTime()) / 1000));
}

export type QuotaCheck = {
  allowed: boolean;
  retryAfterSeconds: number;
  reason?: "kind" | "total";
};

/**
 * Stateful service over a QuotaStore. `check` is read-only (never increments,
 * so a request rejected later by validation can't have been counted). `record`
 * increments after a paid provider call succeeds.
 */
export interface QuotaService {
  check(installId: string, kind: QuotaKind): QuotaCheck;
  record(installId: string, kind: QuotaKind): void;
}

export function createQuotaService(
  store: QuotaStore,
  config: QuotaConfig,
  clock: () => Date = () => new Date(),
): QuotaService {
  return {
    check(installId, kind) {
      const now = clock();
      const usage = usageForToday(store.get(installId), utcDay(now));
      const decision = evaluateQuota(usage, config, kind);
      return {
        allowed: decision.allowed,
        reason: decision.reason,
        retryAfterSeconds: decision.allowed
          ? 0
          : secondsUntilNextUtcMidnight(now),
      };
    },
    record(installId, kind) {
      const now = clock();
      const usage = usageForToday(store.get(installId), utcDay(now));
      store.set(installId, { ...usage, [kind]: usage[kind] + 1 });
    },
  };
}
