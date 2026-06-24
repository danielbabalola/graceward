import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { createOpenAiTranscriptionProvider } from "../src/ai/openai-transcription-provider.js";
import { AiError } from "../src/ai/types.js";

const URL = "/ai/transcribe-reflection";

const ENV_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_TRANSCRIPTION_MODEL",
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

type FilePart = { filename: string; contentType: string; content: Buffer };

/** Builds a multipart/form-data body for inject(). No external deps. */
function buildMultipart(
  fields: Record<string, string>,
  file?: { fieldName: string } & FilePart,
): { body: Buffer; contentType: string } {
  const boundary = "----gracewardtestboundary";
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
  if (file) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.filename}"\r\n` +
          `Content-Type: ${file.contentType}\r\n\r\n`,
      ),
    );
    chunks.push(file.content);
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe("POST /ai/transcribe-reflection", () => {
  it("returns INVALID_REQUEST when the request is not multipart", async () => {
    await withApp(async (app) => {
      const res = await app.inject({
        method: "POST",
        url: URL,
        payload: { journalEntryId: "local_1" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("INVALID_REQUEST");
    });
  });

  it("returns NO_AUDIO_FILE when metadata is present but no file is uploaded", async () => {
    await withApp(async (app) => {
      const { body, contentType } = buildMultipart({
        journalEntryId: "local_1",
        audioAssetId: "asset_1",
      });
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: { "content-type": contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("NO_AUDIO_FILE");
    });
  });

  it("returns INVALID_REQUEST when required metadata is missing", async () => {
    await withApp(async (app) => {
      const { body, contentType } = buildMultipart(
        { journalEntryId: "local_1" },
        {
          fieldName: "file",
          filename: "rec.m4a",
          contentType: "audio/m4a",
          content: Buffer.from("fake-audio-bytes"),
        },
      );
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: { "content-type": contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("INVALID_REQUEST");
    });
  });

  it("returns UNSUPPORTED_AUDIO for a disallowed content type", async () => {
    await withApp(async (app) => {
      const { body, contentType } = buildMultipart(
        { journalEntryId: "local_1", audioAssetId: "asset_1" },
        {
          fieldName: "file",
          filename: "clip.mov",
          contentType: "video/quicktime",
          content: Buffer.from("not-audio"),
        },
      );
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: { "content-type": contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(415);
      expect(res.json().error.code).toBe("UNSUPPORTED_AUDIO");
    });
  });

  it("returns AI_NOT_CONFIGURED for a valid upload when no API key is set", async () => {
    await withApp(async (app) => {
      const { body, contentType } = buildMultipart(
        { journalEntryId: "local_1", audioAssetId: "asset_1" },
        {
          fieldName: "file",
          filename: "rec.m4a",
          contentType: "audio/m4a",
          content: Buffer.from("fake-audio-bytes"),
        },
      );
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: { "content-type": contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().error.code).toBe("AI_NOT_CONFIGURED");
    });
  });

  it("never echoes the audio bytes in the error body", async () => {
    const marker = "MARKER_AUDIO_7c3";
    await withApp(async (app) => {
      const { body, contentType } = buildMultipart(
        { journalEntryId: "local_1", audioAssetId: "asset_1" },
        {
          fieldName: "file",
          filename: "rec.m4a",
          contentType: "audio/m4a",
          content: Buffer.from(`audio ${marker} bytes`),
        },
      );
      const res = await app.inject({
        method: "POST",
        url: URL,
        headers: { "content-type": contentType },
        payload: body,
      });
      expect(res.body).not.toContain(marker);
    });
  });

  it("returns 429 RATE_LIMITED once the limit is exceeded", async () => {
    process.env.AI_RATE_LIMIT_MAX = "1";
    process.env.AI_RATE_LIMIT_WINDOW_SECONDS = "60";
    await withApp(async (app) => {
      const first = await app.inject({ method: "POST", url: URL, payload: {} });
      expect(first.statusCode).not.toBe(429);
      const second = await app.inject({ method: "POST", url: URL, payload: {} });
      expect(second.statusCode).toBe(429);
      expect(second.json().error.code).toBe("RATE_LIMITED");
      expect(second.headers["retry-after"]).toBeDefined();
    });
  });
});

describe("createOpenAiTranscriptionProvider", () => {
  it("throws AI_NOT_CONFIGURED when the API key is missing", () => {
    expect(() => createOpenAiTranscriptionProvider()).toThrowError(AiError);
    try {
      createOpenAiTranscriptionProvider();
    } catch (error) {
      expect(error).toBeInstanceOf(AiError);
      expect((error as AiError).code).toBe("AI_NOT_CONFIGURED");
      expect((error as AiError).httpStatus).toBe(503);
    }
  });

  it("uses the configured model and reports the openai provider name", () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_TRANSCRIPTION_MODEL = "whisper-1";
    const provider = createOpenAiTranscriptionProvider();
    expect(provider.name).toBe("openai");
    expect(provider.model).toBe("whisper-1");
  });

  it("falls back to the default model when none is configured", () => {
    process.env.OPENAI_API_KEY = "test-key";
    const provider = createOpenAiTranscriptionProvider();
    expect(provider.model).toBe("gpt-4o-mini-transcribe");
  });
});
