import { describe, expect, it } from "vitest";
import {
  MAX_FOLLOW_UP_QUESTIONS,
  MAX_SUGGESTIONS_PER_KIND,
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
    expect(clamped.gentleFollowUpQuestions.length).toBe(MAX_FOLLOW_UP_QUESTIONS);
  });

  it("leaves under-cap arrays untouched", () => {
    const result: AnalyzeReflectionResponse = {
      pastoralReflection: "reflection",
      prayerSuggestions: [{ title: "one", description: "" }],
      gratitudeSuggestions: [],
      faithfulnessMomentSuggestions: [],
      lessonSuggestions: [{ title: "lesson", content: "content" }],
      gentleFollowUpQuestions: ["only one"],
    };
    const clamped = clampResult(result);
    expect(clamped.prayerSuggestions.length).toBe(1);
    expect(clamped.lessonSuggestions.length).toBe(1);
    expect(clamped.gentleFollowUpQuestions.length).toBe(1);
  });
});
