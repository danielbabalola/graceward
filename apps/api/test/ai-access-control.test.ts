import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance, InjectOptions } from "fastify";
import { buildApp } from "../src/app.js";

// Valid (UUID-shaped) anonymous install ID + header used for allowed requests.
const INSTALL_ID = "33333333-3333-4333-8333-333333333333";
const INSTALL_HEADERS = { "x-graceward-install-id": INSTALL_ID };

// All env that can influence access-control behavior, snapshotted/cleared per
// test so each starts key-free with default quotas and AI enabled. No test sets
// OPENAI_API_KEY, so a real provider call can never happen — when access control
// passes, the route surfaces AI_NOT_CONFIGURED (proving the provider was the
// next step but was never actually called).
const ENV_KEYS = [
  "OPENAI_API_KEY",
  "AI_ENDPOINTS_ENABLED",
  "AI_RATE_LIMIT_MAX",
  "AI_RATE_LIMIT_WINDOW_SECONDS",
  "AI_DAILY_TOTAL_QUOTA_PER_INSTALL",
  "AI_DAILY_ANALYZE_QUOTA_PER_INSTALL",
  "AI_DAILY_TRANSCRIBE_QUOTA_PER_INSTALL",
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

async function withApp(fn: (app: FastifyInstance) => Promise<void>): Promise<void> {
  const app = buildApp({ logger: false });
  try {
    await app.ready();
    await fn(app);
  } finally {
    await app.close();
  }
}

/** Minimal multipart body builder (no external deps). */
function buildMultipart(fields: Record<string, string>): {
  body: Buffer;
  contentType: string;
} {
  const boundary = "----gracewardaccessboundary";
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
          `${value}\r\n`,
      ),
    );
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="rec.m4a"\r\n` +
        `Content-Type: audio/m4a\r\n\r\n`,
    ),
  );
  chunks.push(Buffer.from("fake-audio-bytes"));
  chunks.push(Buffer.from("\r\n"));
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

type Endpoint = {
  name: string;
  url: string;
  quotaEnvKey: string;
  /** Builds inject options for an otherwise-valid request with the given headers. */
  valid: (headers: Record<string, string>) => InjectOptions;
};

const analyzeBody = {
  journalEntryId: "local_1",
  entryDate: "2026-01-15",
  mode: "free_flow",
  inputType: "text",
  rawText: "Today I felt grateful and a little tired.",
};

const ENDPOINTS: Endpoint[] = [
  {
    name: "analyze-reflection",
    url: "/ai/analyze-reflection",
    quotaEnvKey: "AI_DAILY_ANALYZE_QUOTA_PER_INSTALL",
    valid: (headers) => ({
      method: "POST",
      url: "/ai/analyze-reflection",
      headers,
      payload: analyzeBody,
    }),
  },
  {
    name: "transcribe-reflection",
    url: "/ai/transcribe-reflection",
    quotaEnvKey: "AI_DAILY_TRANSCRIBE_QUOTA_PER_INSTALL",
    valid: (headers) => {
      const { body, contentType } = buildMultipart({
        journalEntryId: "local_1",
        audioAssetId: "asset_1",
      });
      return {
        method: "POST",
        url: "/ai/transcribe-reflection",
        headers: { ...headers, "content-type": contentType },
        payload: body,
      };
    },
  },
  {
    name: "structure-voice-entry",
    url: "/ai/structure-voice-entry",
    quotaEnvKey: "AI_DAILY_STRUCTURE_QUOTA_PER_INSTALL",
    valid: (headers) => {
      const { body, contentType } = buildMultipart({
        entryType: "prayer",
        entryDate: "2026-06-24",
      });
      return {
        method: "POST",
        url: "/ai/structure-voice-entry",
        headers: { ...headers, "content-type": contentType },
        payload: body,
      };
    },
  },
];

describe.each(ENDPOINTS)("AI access control: $name", (endpoint) => {
  it("rejects a missing install ID with 401 INSTALL_ID_REQUIRED (no provider call)", async () => {
    await withApp(async (app) => {
      const res = await app.inject(endpoint.valid({}));
      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.error.code).toBe("INSTALL_ID_REQUIRED");
      // Proves the provider was never reached: with no key, reaching the
      // provider would have produced AI_NOT_CONFIGURED instead.
      expect(body.error.code).not.toBe("AI_NOT_CONFIGURED");
    });
  });

  it("rejects an invalid install ID with 401 INSTALL_ID_REQUIRED", async () => {
    await withApp(async (app) => {
      const res = await app.inject(
        endpoint.valid({ "x-graceward-install-id": "not-a-uuid" }),
      );
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("INSTALL_ID_REQUIRED");
    });
  });

  it("returns 503 AI_DISABLED when the kill switch is off (no provider call)", async () => {
    process.env.AI_ENDPOINTS_ENABLED = "false";
    await withApp(async (app) => {
      const res = await app.inject(endpoint.valid(INSTALL_HEADERS));
      expect(res.statusCode).toBe(503);
      const body = res.json();
      expect(body.error.code).toBe("AI_DISABLED");
      expect(body.error.code).not.toBe("AI_NOT_CONFIGURED");
    });
  });

  it("returns 429 AI_QUOTA_EXCEEDED when the daily quota is exhausted (no provider call)", async () => {
    // A zero cap is an explicit freeze: the first valid request is blocked.
    process.env[endpoint.quotaEnvKey] = "0";
    await withApp(async (app) => {
      const res = await app.inject(endpoint.valid(INSTALL_HEADERS));
      expect(res.statusCode).toBe(429);
      const body = res.json();
      expect(body.error.code).toBe("AI_QUOTA_EXCEEDED");
      expect(body.error.code).not.toBe("AI_NOT_CONFIGURED");
      expect(res.headers["retry-after"]).toBeDefined();
    });
  });

  it("passes access control to the provider when ID + quota are valid (AI_NOT_CONFIGURED with no key)", async () => {
    await withApp(async (app) => {
      const res = await app.inject(endpoint.valid(INSTALL_HEADERS));
      // Access control allowed the request through; the provider step then
      // reports it isn't configured (no OPENAI_API_KEY in tests).
      expect(res.statusCode).toBe(503);
      expect(res.json().error.code).toBe("AI_NOT_CONFIGURED");
    });
  });
});
