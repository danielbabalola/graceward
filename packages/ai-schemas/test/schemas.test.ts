import { describe, expect, it } from "vitest";
import {
  analyzeReflectionRequestSchema,
  analyzeReflectionResponseSchema,
  prayerSuggestionSchema,
  MAX_REFLECTION_CHARS,
} from "../src/index.js";

const validRequest = {
  journalEntryId: "local_123",
  entryDate: "2026-01-15",
  mode: "free_flow" as const,
  inputType: "text" as const,
  rawText: "Today felt heavy, but I kept showing up.",
};

describe("analyzeReflectionRequestSchema", () => {
  it("accepts a valid request", () => {
    const parsed = analyzeReflectionRequestSchema.safeParse(validRequest);
    expect(parsed.success).toBe(true);
  });

  it("rejects blank rawText", () => {
    const parsed = analyzeReflectionRequestSchema.safeParse({
      ...validRequest,
      rawText: "   ",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a non-text inputType", () => {
    const parsed = analyzeReflectionRequestSchema.safeParse({
      ...validRequest,
      inputType: "voice",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unsupported mode", () => {
    const parsed = analyzeReflectionRequestSchema.safeParse({
      ...validRequest,
      mode: "conflict",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized rawText", () => {
    const parsed = analyzeReflectionRequestSchema.safeParse({
      ...validRequest,
      rawText: "a".repeat(MAX_REFLECTION_CHARS + 1),
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts rawText exactly at the limit", () => {
    const parsed = analyzeReflectionRequestSchema.safeParse({
      ...validRequest,
      rawText: "a".repeat(MAX_REFLECTION_CHARS),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const { journalEntryId, ...withoutId } = validRequest;
    void journalEntryId;
    const parsed = analyzeReflectionRequestSchema.safeParse(withoutId);
    expect(parsed.success).toBe(false);
  });
});

describe("analyzeReflectionResponseSchema", () => {
  const validResponse = {
    pastoralReflection: "You showed up, and that matters.",
    prayerSuggestions: [{ title: "Rest", description: "Ask God for rest." }],
    gratitudeSuggestions: [{ content: "A quiet morning" }],
    faithfulnessMomentSuggestions: [{ content: "Kept going" }],
    gentleFollowUpQuestions: ["What helped you keep showing up?"],
  };

  it("accepts a valid response and applies array defaults", () => {
    const parsed = analyzeReflectionResponseSchema.safeParse({
      pastoralReflection: "Just the reflection.",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.prayerSuggestions).toEqual([]);
      expect(parsed.data.gratitudeSuggestions).toEqual([]);
      expect(parsed.data.faithfulnessMomentSuggestions).toEqual([]);
      expect(parsed.data.gentleFollowUpQuestions).toEqual([]);
    }
  });

  it("accepts a fully populated response", () => {
    const parsed = analyzeReflectionResponseSchema.safeParse(validResponse);
    expect(parsed.success).toBe(true);
  });

  it("rejects a response missing pastoralReflection", () => {
    const { pastoralReflection, ...withoutReflection } = validResponse;
    void pastoralReflection;
    const parsed = analyzeReflectionResponseSchema.safeParse(withoutReflection);
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty pastoralReflection", () => {
    const parsed = analyzeReflectionResponseSchema.safeParse({
      ...validResponse,
      pastoralReflection: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a prayer suggestion without a title", () => {
    const parsed = analyzeReflectionResponseSchema.safeParse({
      ...validResponse,
      prayerSuggestions: [{ description: "no title here" }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("prayerSuggestionSchema followUpAt", () => {
  it("accepts a strict YYYY-MM-DD date", () => {
    const parsed = prayerSuggestionSchema.safeParse({
      title: "Interview",
      followUpAt: "2026-03-09",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts null and omitted followUpAt", () => {
    expect(
      prayerSuggestionSchema.safeParse({ title: "x", followUpAt: null }).success,
    ).toBe(true);
    expect(prayerSuggestionSchema.safeParse({ title: "x" }).success).toBe(true);
  });

  it.each(["2026-3-9", "03/09/2026", "09-03-2026", "March 9", "2026-13-40"])(
    "rejects malformed date %s",
    (value) => {
      const parsed = prayerSuggestionSchema.safeParse({
        title: "x",
        followUpAt: value,
      });
      expect(parsed.success).toBe(false);
    },
  );
});
