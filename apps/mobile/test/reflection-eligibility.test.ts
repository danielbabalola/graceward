import { describe, expect, it } from "vitest";
import type { JournalEntry } from "@graceward/shared";
import {
  buildAnalyzeRequest,
  canAnalyzeEntry,
  isAiResultStale,
} from "@/lib/api/reflection";

function makeEntry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    id: "local_1",
    entryDate: "2026-01-15",
    reflectionPath: "free_flow",
    mode: "free_flow",
    inputType: "text",
    rawText: "Today felt heavy, but I kept showing up.",
    title: null,
    structuredPayloadJson: null,
    status: "saved",
    syncStatus: "local_only",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("buildAnalyzeRequest", () => {
  it("builds a request for a text entry", () => {
    const request = buildAnalyzeRequest(makeEntry({}));
    expect(request).not.toBeNull();
    expect(request?.inputType).toBe("text");
    expect(request?.rawText).toBe("Today felt heavy, but I kept showing up.");
  });

  it("is not eligible for a voice entry without a transcript", () => {
    const entry = makeEntry({ inputType: "voice", rawText: null });
    expect(buildAnalyzeRequest(entry)).toBeNull();
    expect(canAnalyzeEntry(entry)).toBe(false);
  });

  it("becomes eligible for a voice entry once a transcript is saved", () => {
    const entry = makeEntry({
      inputType: "voice",
      rawText: "A spoken reflection, now transcribed to text.",
    });
    const request = buildAnalyzeRequest(entry);
    expect(request).not.toBeNull();
    expect(canAnalyzeEntry(entry)).toBe(true);
    // The transcript is sent as text — never as audio.
    expect(request?.inputType).toBe("text");
    expect(request?.rawText).toBe(
      "A spoken reflection, now transcribed to text.",
    );
  });

  it("stays ineligible for a transcribed voice entry in an unsupported mode", () => {
    const entry = makeEntry({
      inputType: "voice",
      mode: "conflict",
      rawText: "A transcribed reflection in a non-analyzable mode.",
    });
    expect(buildAnalyzeRequest(entry)).toBeNull();
    expect(canAnalyzeEntry(entry)).toBe(false);
  });

  it("is not eligible for a voice transcript that is only whitespace", () => {
    const entry = makeEntry({ inputType: "voice", rawText: "   " });
    expect(buildAnalyzeRequest(entry)).toBeNull();
  });
});

describe("isAiResultStale", () => {
  it("is stale when the entry was updated after the result was created", () => {
    expect(
      isAiResultStale(
        "2026-01-15T10:05:00.000Z",
        "2026-01-15T10:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("is not stale when the result is newer than (or equal to) the entry", () => {
    expect(
      isAiResultStale(
        "2026-01-15T10:00:00.000Z",
        "2026-01-15T10:05:00.000Z",
      ),
    ).toBe(false);
    expect(
      isAiResultStale(
        "2026-01-15T10:00:00.000Z",
        "2026-01-15T10:00:00.000Z",
      ),
    ).toBe(false);
  });

  it("treats a transcript edit (later updatedAt) as making a prior result stale", () => {
    const resultCreatedAt = "2026-01-15T10:00:00.000Z";
    // Editing the transcript bumps updatedAt to a later time.
    const editedUpdatedAt = "2026-01-15T11:30:00.000Z";
    expect(isAiResultStale(editedUpdatedAt, resultCreatedAt)).toBe(true);
  });
});
