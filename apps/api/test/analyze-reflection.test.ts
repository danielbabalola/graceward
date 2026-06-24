import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

const URL = "/ai/analyze-reflection";

const validBody = {
  journalEntryId: "local_1",
  entryDate: "2026-01-15",
  mode: "free_flow",
  inputType: "text",
  rawText: "Today I felt grateful and a little tired.",
};

// Env that influences route behavior. Snapshotted/cleared per test so the
// limiter and provider config start from a known, key-free state — tests never
// require (or use) a real OPENAI_API_KEY, so no live provider call can happen.
const ENV_KEYS = [
  "OPENAI_API_KEY",
  "AI_RATE_LIMIT_MAX",
  "AI_RATE_LIMIT_WINDOW_SECONDS",
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

async function withApp(fn: (app: FastifyInstance) => Promise<void>): Promise<void> {
  const app = buildApp({ logger: false });
  try {
    await app.ready();
    await fn(app);
  } finally {
    await app.close();
  }
}

describe("POST /ai/analyze-reflection", () => {
  it("returns a 400 structured error for an invalid request", async () => {
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        payload: { mode: "free_flow" },
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe("INVALID_REQUEST");
      expect(typeof body.error.requestId).toBe("string");
      expect(body.error.requestId.length).toBeGreaterThan(0);
    });
  });

  it("returns AI_NOT_CONFIGURED when no API key is set", async () => {
    await withApp(async (app) => {
      const res = await app.inject({ method: "POST", url: URL, payload: validBody });
      expect(res.statusCode).toBe(503);
      const body = res.json();
      expect(body.error.code).toBe("AI_NOT_CONFIGURED");
      expect(typeof body.error.requestId).toBe("string");
    });
  });

  it("returns 429 RATE_LIMITED once the limit is exceeded", async () => {
    // Set before buildApp: the limiter reads these at route registration.
    process.env.AI_RATE_LIMIT_MAX = "1";
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS = "60";
    await withApp(async (app) => {
      const first = await app.inject({ method: "POST", url: URL, payload: validBody });
      // First request is allowed through (503 here, since no key is configured).
      expect(first.statusCode).not.toBe(429);

      const second = await app.inject({ method: "POST", url: URL, payload: validBody });
      expect(second.statusCode).toBe(429);
      const body = second.json();
      expect(body.error.code).toBe("RATE_LIMITED");
      expect(typeof body.error.requestId).toBe("string");
      expect(second.headers["retry-after"]).toBeDefined();
    });
  });

  it("never echoes submitted reflection text in the error body", async () => {
    const marker = "MARKER_SECRET_8e1f2";
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        payload: { ...validBody, rawText: `please keep ${marker} private` },
      });
      expect(res.statusCode).toBe(503);
      // Raw string body must not contain the submitted reflection content.
      expect(res.body).not.toContain(marker);
    });
  });
});

describe("GET /health", () => {
  it("reports ok", async () => {
    await withApp(async (app) => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: "ok", service: "api" });
    });
  });
});
