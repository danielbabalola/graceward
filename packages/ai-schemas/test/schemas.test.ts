import { describe, expect, it } from "vitest";
import {
  analyzeReflectionRequestSchema,
  analyzeReflectionResponseSchema,
  gratitudeSuggestionSchema,
  lessonSuggestionSchema,
  prayerSuggestionSchema,
  quoteSchema,
  reflectionModelOutputSchema,
  scriptureSchema,
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
    lessonSuggestions: [
      { title: "Showing up matters", content: "You may be learning to keep going." },
    ],
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
      expect(parsed.data.lessonSuggestions).toEqual([]);
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

  it("accepts an optional suggestedPrayer, scripture, and quote", () => {
    const parsed = analyzeReflectionResponseSchema.safeParse({
      ...validResponse,
      suggestedPrayer: "Father, thank you for being near. Help me trust you. Amen.",
      scripture: {
        reference: "Psalm 23:1",
        text: "The LORD is my shepherd; I shall not want.",
        translation: "KJV",
        theme: "Trust",
      },
      quote: {
        text: "Never be afraid to trust an unknown future to a known God.",
        author: "Corrie ten Boom",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("omits suggestedPrayer/scripture/quote when absent", () => {
    const parsed = analyzeReflectionResponseSchema.safeParse({
      pastoralReflection: "Just the reflection.",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.suggestedPrayer).toBeUndefined();
      expect(parsed.data.scripture).toBeUndefined();
      expect(parsed.data.quote).toBeUndefined();
    }
  });
});

describe("scriptureSchema and quoteSchema", () => {
  it("requires reference, text, and translation for scripture", () => {
    expect(
      scriptureSchema.safeParse({
        reference: "John 14:27",
        text: "Peace I leave with you.",
        translation: "KJV",
      }).success,
    ).toBe(true);
    expect(
      scriptureSchema.safeParse({ reference: "John 14:27", text: "Peace." })
        .success,
    ).toBe(false);
  });

  it("requires text and author for a quote", () => {
    expect(
      quoteSchema.safeParse({
        text: "What comes into our minds when we think about God is the most important thing about us.",
        author: "A. W. Tozer",
        source: "The Knowledge of the Holy",
      }).success,
    ).toBe(true);
    expect(quoteSchema.safeParse({ text: "Orphaned quote" }).success).toBe(
      false,
    );
  });
});

describe("reflectionModelOutputSchema", () => {
  it("accepts scriptureId/quoteId as string or null and omits resolved objects", () => {
    const parsed = reflectionModelOutputSchema.safeParse({
      pastoralReflection: "A reflection.",
      suggestedPrayer: "Lord, help me. Amen.",
      scriptureId: "psalm-23-1",
      quoteId: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scriptureId).toBe("psalm-23-1");
      expect(parsed.data.quoteId).toBeNull();
      expect("scripture" in parsed.data).toBe(false);
    }
  });

  it("accepts omitted ids", () => {
    const parsed = reflectionModelOutputSchema.safeParse({
      pastoralReflection: "A reflection.",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("lessonSuggestionSchema", () => {
  it("accepts a lesson with title and content", () => {
    const parsed = lessonSuggestionSchema.safeParse({
      title: "Trusting in waiting",
      content: "You may be noticing patience growing as you wait.",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an optional theme", () => {
    const parsed = lessonSuggestionSchema.safeParse({
      title: "Trusting in waiting",
      content: "Patience is growing.",
      theme: "Trust",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a lesson without a title", () => {
    const parsed = lessonSuggestionSchema.safeParse({
      content: "no title here",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a lesson without content", () => {
    const parsed = lessonSuggestionSchema.safeParse({ title: "no content" });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(
      lessonSuggestionSchema.safeParse({ title: "", content: "x" }).success,
    ).toBe(false);
    expect(
      lessonSuggestionSchema.safeParse({ title: "x", content: "" }).success,
    ).toBe(false);
  });
});

describe("suggestion tags", () => {
  it("accepts an optional tags array on each suggestion kind", () => {
    expect(
      gratitudeSuggestionSchema.safeParse({
        content: "A quiet morning",
        tags: ["Provision", "Rest"],
      }).success,
    ).toBe(true);
    expect(
      lessonSuggestionSchema.safeParse({
        title: "Patience",
        content: "Growing in waiting.",
        tags: ["Trust"],
      }).success,
    ).toBe(true);
    expect(
      prayerSuggestionSchema.safeParse({ title: "Rest", tags: ["Health"] })
        .success,
    ).toBe(true);
  });

  it("accepts an empty tags array and omitted tags", () => {
    expect(
      gratitudeSuggestionSchema.safeParse({ content: "x", tags: [] }).success,
    ).toBe(true);
    expect(gratitudeSuggestionSchema.safeParse({ content: "x" }).success).toBe(
      true,
    );
  });

  it("rejects blank tag strings", () => {
    expect(
      gratitudeSuggestionSchema.safeParse({ content: "x", tags: [""] }).success,
    ).toBe(false);
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
