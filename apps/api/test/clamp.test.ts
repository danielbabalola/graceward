import { describe, expect, it } from "vitest";
import {
  MAX_FOLLOW_UP_QUESTIONS,
  MAX_SUGGESTIONS_PER_KIND,
  MAX_TAGS_PER_ENTRY,
  type AnalyzeReflectionResponse,
} from "@graceward/ai-schemas";
import { clampResult } from "../src/ai/openai-provider.js";

function oversizedResult(n: number): AnalyzeReflectionResponse {
  return {
    pastoralReflection: "reflection",
    prayerSuggestions: Array.from({ length: n }, (_, i) => ({
      title: `prayer ${i}`,
      description: "",
    })),
    gratitudeSuggestions: Array.from({ length: n }, (_, i) => ({
      content: `gratitude ${i}`,
    })),
    faithfulnessMomentSuggestions: Array.from({ length: n }, (_, i) => ({
      content: `moment ${i}`,
    })),
    lessonSuggestions: Array.from({ length: n }, (_, i) => ({
      title: `lesson ${i}`,
      content: `content ${i}`,
    })),
    instructionSuggestions: Array.from({ length: n }, (_, i) => ({
      title: `instruction ${i}`,
      content: `content ${i}`,
    })),
    gentleFollowUpQuestions: Array.from({ length: n }, (_, i) => `question ${i}`),
  };
}

describe("clampResult", () => {
  it("caps each suggestion array and follow-up questions", () => {
    const clamped = clampResult(oversizedResult(25));
    expect(clamped.prayerSuggestions.length).toBe(MAX_SUGGESTIONS_PER_KIND);
    expect(clamped.gratitudeSuggestions.length).toBe(MAX_SUGGESTIONS_PER_KIND);
    expect(clamped.faithfulnessMomentSuggestions.length).toBe(
      MAX_SUGGESTIONS_PER_KIND,
    );
    expect(clamped.lessonSuggestions.length).toBe(MAX_SUGGESTIONS_PER_KIND);
    expect(clamped.instructionSuggestions.length).toBe(MAX_SUGGESTIONS_PER_KIND);
    expect(clamped.gentleFollowUpQuestions.length).toBe(MAX_FOLLOW_UP_QUESTIONS);
  });

  it("caps each suggestion's tags to the per-entry maximum", () => {
    const manyTags = Array.from(
      { length: MAX_TAGS_PER_ENTRY + 4 },
      (_, i) => `tag ${i}`,
    );
    const result: AnalyzeReflectionResponse = {
      pastoralReflection: "reflection",
      prayerSuggestions: [{ title: "p", description: "", tags: manyTags }],
      gratitudeSuggestions: [{ content: "g", tags: manyTags }],
      faithfulnessMomentSuggestions: [{ content: "m", tags: manyTags }],
      lessonSuggestions: [{ title: "l", content: "c", tags: manyTags }],
      instructionSuggestions: [{ title: "i", content: "c", tags: manyTags }],
      gentleFollowUpQuestions: [],
    };
    const clamped = clampResult(result);
    expect(clamped.prayerSuggestions[0].tags?.length).toBe(MAX_TAGS_PER_ENTRY);
    expect(clamped.gratitudeSuggestions[0].tags?.length).toBe(
      MAX_TAGS_PER_ENTRY,
    );
    expect(clamped.faithfulnessMomentSuggestions[0].tags?.length).toBe(
      MAX_TAGS_PER_ENTRY,
    );
    expect(clamped.lessonSuggestions[0].tags?.length).toBe(MAX_TAGS_PER_ENTRY);
  });

  it("leaves a suggestion without tags untouched", () => {
    const result: AnalyzeReflectionResponse = {
      pastoralReflection: "reflection",
      prayerSuggestions: [{ title: "p", description: "" }],
      gratitudeSuggestions: [],
      faithfulnessMomentSuggestions: [],
      lessonSuggestions: [],
      instructionSuggestions: [],
      gentleFollowUpQuestions: [],
    };
    const clamped = clampResult(result);
    expect(clamped.prayerSuggestions[0].tags).toBeUndefined();
  });

  it("leaves under-cap arrays untouched", () => {
    const result: AnalyzeReflectionResponse = {
      pastoralReflection: "reflection",
      prayerSuggestions: [{ title: "one", description: "" }],
      gratitudeSuggestions: [],
      faithfulnessMomentSuggestions: [],
      lessonSuggestions: [{ title: "lesson", content: "content" }],
      instructionSuggestions: [],
      gentleFollowUpQuestions: ["only one"],
    };
    const clamped = clampResult(result);
    expect(clamped.prayerSuggestions.length).toBe(1);
    expect(clamped.lessonSuggestions.length).toBe(1);
    expect(clamped.gentleFollowUpQuestions.length).toBe(1);
  });
});
