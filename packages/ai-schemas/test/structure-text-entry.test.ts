import { describe, expect, it } from "vitest";
import {
  MAX_TEXT_ENTRY_CHARS,
  structurableEntryTypeSchema,
  structureTextEntryRequestSchema,
  structureTextEntryResponseSchema,
} from "../src/index.js";

describe("structurableEntryTypeSchema", () => {
  it("accepts every structurable entry type, including the revelation kinds", () => {
    for (const type of [
      "prayer",
      "gratitude",
      "faithfulness",
      "lesson",
      "dream",
      "prophecy",
      "instruction",
    ]) {
      expect(structurableEntryTypeSchema.safeParse(type).success).toBe(true);
    }
  });
});

describe("structureTextEntryRequestSchema", () => {
  it("accepts a valid typed-text request", () => {
    expect(
      structureTextEntryRequestSchema.safeParse({
        entryType: "gratitude",
        entryDate: "2026-06-24",
        text: "so thankful for my family today",
      }).success,
    ).toBe(true);
  });

  it("rejects empty text", () => {
    expect(
      structureTextEntryRequestSchema.safeParse({
        entryType: "gratitude",
        entryDate: "2026-06-24",
        text: "   ",
      }).success,
    ).toBe(false);
  });

  it("rejects text beyond the maximum length", () => {
    expect(
      structureTextEntryRequestSchema.safeParse({
        entryType: "lesson",
        entryDate: "2026-06-24",
        text: "x".repeat(MAX_TEXT_ENTRY_CHARS + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown entry type", () => {
    expect(
      structureTextEntryRequestSchema.safeParse({
        entryType: "nope",
        entryDate: "2026-06-24",
        text: "hello",
      }).success,
    ).toBe(false);
  });
});

describe("structureTextEntryResponseSchema", () => {
  it("parses an instruction result with a due date", () => {
    expect(
      structureTextEntryResponseSchema.safeParse({
        entryType: "instruction",
        fields: {
          title: "Call my brother",
          content: "I sense I'm being asked to call my brother this week.",
          dueAt: "2026-06-29",
        },
      }).success,
    ).toBe(true);
  });

  it("parses a dream result without a transcript field", () => {
    const parsed = structureTextEntryResponseSchema.safeParse({
      entryType: "dream",
      fields: { title: "By the sea", content: "Walking by the sea." },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects fields that don't match the discriminated entry type", () => {
    // Gratitude fields under an instruction discriminator must fail (no title).
    expect(
      structureTextEntryResponseSchema.safeParse({
        entryType: "instruction",
        fields: { content: "Just a note." },
      }).success,
    ).toBe(false);
  });
});
