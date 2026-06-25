import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

const URL = "/ai/structure-text-entry";

const validBody = {
  entryType: "gratitude",
  entryDate: "2026-06-24",
  text: "so thankful for my family and a quiet morning",
};

// A valid (UUID-shaped) anonymous install ID and its header. Required now that
// the AI endpoints enforce closed-beta access control.
const INSTALL_ID = "11111111-1111-4111-8111-111111111111";
const INSTALL_HEADERS = { "x-graceward-install-id": INSTALL_ID };

// Env that influences route behavior. Snapshotted/cleared per test so the
// limiter, quota, and provider config start from a known, key-free state —
// tests never require (or use) a real OPENAI_API_KEY, so no live provider call
// can happen (the request stops at AI_NOT_CONFIGURED before any network work).
const ENV_KEYS = [
  "OPENAI_API_KEY",
  "AI_RATE_LIMIT_MAX",
  "AI_RATE_LIMIT_WINDOW_SECONDS",
  "AI_ENDPOINTS_ENABLED",
  "AI_DAILY_TOTAL_QUOTA_PER_INSTALL",
  "AI_DAILY_STRUCTURE_QUOTA_PER_INSTALL",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

async function withApp(
  fn: (app: FastifyInstance) => Promise<void>,
): Promise<void> {
  const app = buildApp({ logger: false });
  try {
    await app.ready();
    await fn(app);
  } finally {
    await app.close();
  }
}

describe("POST /ai/structure-text-entry", () => {
  it("returns 401 INSTALL_ID_REQUIRED without a valid install id", async () => {
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        payload: validBody,
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("INSTALL_ID_REQUIRED");
    });
  });

  it("returns a 400 structured error for an invalid request", async () => {
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: INSTALL_HEADERS,
        payload: { entryType: "gratitude" },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe("INVALID_REQUEST");
      expect(typeof body.error.requestId).toBe("string");
      expect(body.error.requestId.length).toBeGreaterThan(0);
    });
  });

  it("rejects an unknown entry type", async () => {
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: INSTALL_HEADERS,
        payload: { ...validBody, entryType: "nope" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("INVALID_REQUEST");
    });
  });

  it("returns AI_NOT_CONFIGURED when no API key is set", async () => {
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: INSTALL_HEADERS,
        payload: validBody,
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error.code).toBe("AI_NOT_CONFIGURED");
    });
  });

  it("returns 503 AI_DISABLED when the kill switch is off", async () => {
    process.env.AI_ENDPOINTS_ENABLED = "false";
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: INSTALL_HEADERS,
        payload: validBody,
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error.code).toBe("AI_DISABLED");
    });
  });

  it("returns 429 RATE_LIMITED once the limit is exceeded", async () => {
    process.env.AI_RATE_LIMIT_MAX = "1";
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS = "60";
    await withApp(async (app) => {
      const first = await app.inject({
        method: "POST",
        url: URL,
        headers: INSTALL_HEADERS,
        payload: validBody,
      });
      expect(first.statusCode).not.toBe(429);

      const second = await app.inject({
        method: "POST",
        url: URL,
        headers: INSTALL_HEADERS,
        payload: validBody,
      });
      expect(second.statusCode).toBe(429);
      expect(second.json().error.code).toBe("RATE_LIMITED");
      expect(second.headers["retry-after"]).toBeDefined();
    });
  });

  it("never echoes submitted text in the error body", async () => {
    const marker = "MARKER_SECRET_8e1f2";
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: INSTALL_HEADERS,
        payload: { ...validBody, text: `please keep ${marker} private` },
      });
      expect(res.statusCode).toBe(503);
      expect(res.body).not.toContain(marker);
    });
  });
});
