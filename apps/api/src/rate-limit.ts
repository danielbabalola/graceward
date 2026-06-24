/**
 * Lightweight in-memory, fixed-window rate limiter for a single API instance.
 *
 * This is intentionally simple for MVP/dev: no Redis, no external infra, and no
 * cross-instance coordination. It exists to put a conservative ceiling on AI
 * calls per client identity so a single device can't hammer the (paid) provider
 * or a misbehaving loop can't run away. Revisit before horizontal scaling.
 */

const DEFAULT_MAX = 20;
const DEFAULT_WINDOW_SECONDS = 60;

type WindowState = {
  count: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
};

export type RateLimitConfig = {
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window resets; suitable for a Retry-After header. */
  retryAfterSeconds: number;
};

function resolvePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reads limiter config from env, applying conservative dev-friendly defaults. */
export function resolveRateLimitConfig(): RateLimitConfig {
  return {
    max: resolvePositiveInt(process.env.AI_RATE_LIMIT_MAX, DEFAULT_MAX),
    windowMs:
      resolvePositiveInt(
        process.env.AI_RATE_LIMIT_WINDOW_SECONDS,
        DEFAULT_WINDOW_SECONDS,
      ) * 1000,
  };
}

/**
 * Creates an isolated fixed-window limiter. Keys are opaque (e.g. client IP);
 * the limiter never inspects or stores request content.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const windows = new Map<string, WindowState>();

  function check(key: string, now: number = Date.now()): RateLimitResult {
    const existing = windows.get(key);

    if (!existing || now >= existing.resetAt) {
      windows.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (existing.count >= config.max) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      };
    }

    existing.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Drops expired windows so the map doesn't grow unbounded over time. */
  function sweep(now: number = Date.now()): void {
    for (const [key, state] of windows) {
      if (now >= state.resetAt) {
        windows.delete(key);
      }
    }
  }

  return { check, sweep };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
