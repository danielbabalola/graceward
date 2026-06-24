import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSCRIPTION_MIME_TYPES,
  isSupportedTranscriptionMimeType,
  MAX_TRANSCRIPTION_FILE_BYTES,
  transcribeReflectionMetadataSchema,
  transcribeReflectionResponseSchema,
} from "../src/index.js";

describe("isSupportedTranscriptionMimeType", () => {
  it("accepts every allow-listed type", () => {
    for (const type of ALLOWED_TRANSCRIPTION_MIME_TYPES) {
      expect(isSupportedTranscriptionMimeType(type)).toBe(true);
    }
  });

  it("ignores parameters and casing", () => {
    expect(isSupportedTranscriptionMimeType("AUDIO/M4A")).toBe(true);
    expect(isSupportedTranscriptionMimeType("audio/m4a; codecs=mp4a")).toBe(
      true,
    );
  });

  it("rejects unsupported, empty, and nullish types", () => {
    expect(isSupportedTranscriptionMimeType("video/mp4")).toBe(false);
    expect(isSupportedTranscriptionMimeType("application/json")).toBe(false);
    expect(isSupportedTranscriptionMimeType("")).toBe(false);
    expect(isSupportedTranscriptionMimeType(null)).toBe(false);
    expect(isSupportedTranscriptionMimeType(undefined)).toBe(false);
  });
});

describe("MAX_TRANSCRIPTION_FILE_BYTES", () => {
  it("is OpenAI's 25 MB limit", () => {
    expect(MAX_TRANSCRIPTION_FILE_BYTES).toBe(25 * 1024 * 1024);
  });
});

describe("transcribeReflectionMetadataSchema", () => {
  it("accepts valid metadata", () => {
    const parsed = transcribeReflectionMetadataSchema.safeParse({
      journalEntryId: "local_1",
      audioAssetId: "asset_1",
    });
    expect(parsed.success).toBe(true);
  });

  it.each(["journalEntryId", "audioAssetId"])(
    "rejects a missing %s",
    (field) => {
      const full: Record<string, string> = {
        journalEntryId: "local_1",
        audioAssetId: "asset_1",
      };
      delete full[field];
      expect(transcribeReflectionMetadataSchema.safeParse(full).success).toBe(
        false,
      );
    },
  );

  it("rejects empty identifiers", () => {
    expect(
      transcribeReflectionMetadataSchema.safeParse({
        journalEntryId: "",
        audioAssetId: "asset_1",
      }).success,
    ).toBe(false);
  });
});

describe("transcribeReflectionResponseSchema", () => {
  it("accepts a transcript with optional provider/model", () => {
    const parsed = transcribeReflectionResponseSchema.safeParse({
      transcript: "Today I felt grateful.",
      provider: "openai",
      model: "gpt-4o-mini-transcribe",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a transcript alone", () => {
    expect(
      transcribeReflectionResponseSchema.safeParse({
        transcript: "Just the transcript.",
      }).success,
    ).toBe(true);
  });

  it("rejects an empty transcript", () => {
    expect(
      transcribeReflectionResponseSchema.safeParse({ transcript: "" }).success,
    ).toBe(false);
  });

  it("rejects a missing transcript", () => {
    expect(
      transcribeReflectionResponseSchema.safeParse({ provider: "openai" })
        .success,
    ).toBe(false);
  });
});
