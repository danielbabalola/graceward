import { describe, expect, it } from "vitest";
import {
  MAX_VOICE_ENTRY_TRANSCRIPT_CHARS,
  STRUCTURE_ENTRY_PROMPT_VERSION,
  structureVoiceEntryMetadataSchema,
  structureVoiceEntryResponseSchema,
  voiceEntryFieldSchemas,
  voiceEntryTypeSchema,
} from "../src/index.js";

describe("voiceEntryTypeSchema", () => {
  it("accepts the supported entry types", () => {
    for (const type of [
      "prayer",
      "gratitude",
      "faithfulness",
      "lesson",
      "dream",
      "prophecy",
      "instruction",
    ]) {
      expect(voiceEntryTypeSchema.safeParse(type).success).toBe(true);
    }
  });

  it("rejects unknown entry types", () => {
    expect(voiceEntryTypeSchema.safeParse("wins").success).toBe(false);
    expect(voiceEntryTypeSchema.safeParse("journal").success).toBe(false);
    expect(voiceEntryTypeSchema.safeParse("").success).toBe(false);
  });
});

describe("structureVoiceEntryMetadataSchema", () => {
  it("accepts valid metadata", () => {
    const parsed = structureVoiceEntryMetadataSchema.safeParse({
      entryType: "prayer",
      entryDate: "2026-06-24",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown entry type", () => {
    expect(
      structureVoiceEntryMetadataSchema.safeParse({
        entryType: "nope",
        entryDate: "2026-06-24",
      }).success,
    ).toBe(false);
  });

  it("rejects an empty entry date", () => {
    expect(
      structureVoiceEntryMetadataSchema.safeParse({
        entryType: "lesson",
        entryDate: "",
      }).success,
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      structureVoiceEntryMetadataSchema.safeParse({ entryType: "prayer" })
        .success,
    ).toBe(false);
  });
});

describe("voiceEntryFieldSchemas", () => {
  it("maps each entry type to a field schema", () => {
    expect(Object.keys(voiceEntryFieldSchemas).sort()).toEqual([
      "dream",
      "faithfulness",
      "gratitude",
      "instruction",
      "lesson",
      "prayer",
      "prophecy",
    ]);
  });

  it("requires a prayer title and defaults description to empty", () => {
    const parsed = voiceEntryFieldSchemas.prayer.safeParse({ title: "Rest" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.description).toBe("");
    }
    expect(voiceEntryFieldSchemas.prayer.safeParse({}).success).toBe(false);
  });

  it("requires lesson title and content", () => {
    expect(
      voiceEntryFieldSchemas.lesson.safeParse({ title: "Trust" }).success,
    ).toBe(false);
    expect(
      voiceEntryFieldSchemas.lesson.safeParse({
        title: "Trust",
        content: "Learning to wait.",
      }).success,
    ).toBe(true);
  });
});

describe("structureVoiceEntryResponseSchema", () => {
  it("parses a prayer result with a follow-up date", () => {
    const parsed = structureVoiceEntryResponseSchema.safeParse({
      entryType: "prayer",
      transcript: "Please help me rest, and check back next Monday.",
      fields: {
        title: "Rest well",
        description: "Feeling stretched thin.",
        followUpAt: "2026-06-29",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("parses a prayer result with a null follow-up date", () => {
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "prayer",
        transcript: "Please help me rest.",
        fields: { title: "Rest well", description: "", followUpAt: null },
      }).success,
    ).toBe(true);
  });

  it("rejects a prayer follow-up that is not a calendar date", () => {
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "prayer",
        transcript: "Please help me rest soon.",
        fields: { title: "Rest", description: "", followUpAt: "soon" },
      }).success,
    ).toBe(false);
  });

  it("rejects fields that don't match the discriminated entry type", () => {
    // Gratitude fields under a prayer discriminator must fail (no title).
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "prayer",
        transcript: "Thankful for today.",
        fields: { content: "Thankful for today." },
      }).success,
    ).toBe(false);
  });

  it("parses gratitude, faithfulness, and lesson results", () => {
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "gratitude",
        transcript: "Grateful for my family.",
        fields: { content: "Grateful for my family.", category: "Family" },
      }).success,
    ).toBe(true);
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "faithfulness",
        transcript: "God provided this week.",
        fields: {
          content: "God provided this week.",
          faithfulnessTheme: "Provision",
        },
      }).success,
    ).toBe(true);
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "lesson",
        transcript: "Learning to trust.",
        fields: {
          title: "Trust",
          content: "Learning to wait on God.",
          theme: "Trust",
        },
      }).success,
    ).toBe(true);
  });

  it("parses dream and prophecy results", () => {
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "dream",
        transcript: "I dreamt I was walking by the sea.",
        fields: {
          title: "Walking by the sea",
          content: "I was walking by the sea and felt peace.",
          tags: ["Peace"],
        },
      }).success,
    ).toBe(true);
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "prophecy",
        transcript: "A word about a new season.",
        fields: {
          title: "A new season",
          content: "I sensed a word about a new season coming.",
        },
      }).success,
    ).toBe(true);
  });

  it("rejects a dream missing its content", () => {
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "dream",
        transcript: "A short dream.",
        fields: { title: "A short dream" },
      }).success,
    ).toBe(false);
  });

  it("rejects an empty transcript", () => {
    expect(
      structureVoiceEntryResponseSchema.safeParse({
        entryType: "gratitude",
        transcript: "",
        fields: { content: "Grateful." },
      }).success,
    ).toBe(false);
  });
});

describe("voice entry constants", () => {
  it("exposes a stable prompt version and transcript bound", () => {
    expect(STRUCTURE_ENTRY_PROMPT_VERSION).toBe("structure-entry-v4");
    expect(MAX_VOICE_ENTRY_TRANSCRIPT_CHARS).toBe(8000);
  });
});
