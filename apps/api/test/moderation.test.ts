import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  analysisOutputText,
  contentFlaggedError,
  createModerationGuard,
  entryFieldsText,
} from "../src/ai/moderation.js";
import { AiError } from "../src/ai/types.js";

const ENV_KEYS = [
  "OPENAI_API_KEY",
  "AI_MODERATION_ENABLED",
  "AI_MODERATION_BLOCK_CATEGORIES",
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

describe("createModerationGuard", () => {
  it("returns null when no API key is configured", () => {
    expect(createModerationGuard()).toBeNull();
  });

  it("returns null when explicitly disabled, even with a key", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AI_MODERATION_ENABLED = "false";
    expect(createModerationGuard()).toBeNull();
  });

  it("returns a guard when a key is set and moderation is enabled", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(createModerationGuard()).not.toBeNull();
  });
});

describe("contentFlaggedError", () => {
  it("is a 422 AiError with the CONTENT_FLAGGED code", () => {
    const err = contentFlaggedError();
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe("CONTENT_FLAGGED");
    expect(err.httpStatus).toBe(422);
  });
});

describe("output-text extractors", () => {
  it("flattens an analysis response into the model-authored text", () => {
    const text = analysisOutputText({
      pastoralReflection: "Rest in grace.",
      prayerSuggestions: [{ title: "Peace", description: "for the week" }],
      gratitudeSuggestions: [{ content: "morning light" }],
      faithfulnessMomentSuggestions: [{ content: "provision" }],
      lessonSuggestions: [{ title: "Trust", content: "He provides" }],
      instructionSuggestions: [
        { title: "Call my brother", content: "I sense I'm being asked to" },
      ],
      gentleFollowUpQuestions: ["What stood out?"],
      safetyNote: "reach out",
    });
    for (const piece of [
      "Rest in grace.",
      "Peace",
      "for the week",
      "morning light",
      "provision",
      "Trust",
      "He provides",
      "Call my brother",
      "I sense I'm being asked to",
      "What stood out?",
      "reach out",
    ]) {
      expect(text).toContain(piece);
    }
  });

  it("flattens entry fields across the different entry shapes", () => {
    expect(entryFieldsText({ title: "Rest", description: "soon" })).toContain(
      "Rest",
    );
    expect(entryFieldsText({ content: "thankful" })).toBe("thankful");
  });
});
