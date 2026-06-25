import { describe, expect, it } from "vitest";
import {
  MAX_SUGGESTED_PRAYER_CHARS,
  type ReflectionModelOutput,
} from "@graceward/ai-schemas";
import { clampResult, resolveModelOutput } from "../src/ai/openai-provider.js";
import {
  resolveScripture,
  scriptureCandidatesForMode,
  SCRIPTURE_PACK,
} from "../src/ai/scripture-pack.js";
import {
  quoteCandidatesForMode,
  QUOTE_PACK,
  resolveQuote,
} from "../src/ai/quote-pack.js";

function baseOutput(
  overrides: Partial<ReflectionModelOutput> = {},
): ReflectionModelOutput {
  return {
    pastoralReflection: "A reflection.",
    prayerSuggestions: [],
    gratitudeSuggestions: [],
    faithfulnessMomentSuggestions: [],
    lessonSuggestions: [],
    instructionSuggestions: [],
    gentleFollowUpQuestions: [],
    ...overrides,
  };
}

describe("resolveScripture / resolveQuote", () => {
  it("resolves a known id to the canonical entry", () => {
    const verse = resolveScripture("psalm-23-1");
    expect(verse?.reference).toBe("Psalm 23:1");
    expect(verse?.text).toBe("The LORD is my shepherd; I shall not want.");
    expect(verse?.translation).toBe("KJV");

    const quote = resolveQuote("tozer-think-about-god");
    expect(quote?.author).toBe("A. W. Tozer");
  });

  it("returns null for unknown, empty, or null ids (never fabricates)", () => {
    expect(resolveScripture("not-a-real-id")).toBeNull();
    expect(resolveScripture(null)).toBeNull();
    expect(resolveScripture(undefined)).toBeNull();
    expect(resolveQuote("nope")).toBeNull();
    expect(resolveQuote(null)).toBeNull();
  });
});

describe("resolveModelOutput", () => {
  it("attaches canonical scripture and quote for valid ids", () => {
    const result = resolveModelOutput(
      baseOutput({ scriptureId: "john-14-27", quoteId: "augustine-restless" }),
    );
    expect(result.scripture?.reference).toBe("John 14:27");
    expect(result.scripture?.translation).toBe("KJV");
    expect(result.scripture?.theme).toBeTruthy();
    expect(result.quote?.author).toBe("Augustine of Hippo");
    expect(result.quote?.source).toBe("Confessions");
  });

  it("omits scripture/quote for null or hallucinated ids", () => {
    const result = resolveModelOutput(
      baseOutput({ scriptureId: null, quoteId: "made-up-quote" }),
    );
    expect(result.scripture).toBeUndefined();
    expect(result.quote).toBeUndefined();
  });

  it("does not leak the selection ids into the public response", () => {
    const result = resolveModelOutput(
      baseOutput({ scriptureId: "psalm-23-1" }),
    );
    expect("scriptureId" in result).toBe(false);
    expect("quoteId" in result).toBe(false);
  });
});

describe("clampResult suggestedPrayer", () => {
  it("trims a prayer and drops an empty one", () => {
    const trimmed = clampResult(
      resolveModelOutput(baseOutput({ suggestedPrayer: "  Lord, help me.  " })),
    );
    expect(trimmed.suggestedPrayer).toBe("Lord, help me.");

    const blank = clampResult(
      resolveModelOutput(baseOutput({ suggestedPrayer: "   " })),
    );
    expect(blank.suggestedPrayer).toBeUndefined();
  });

  it("caps an overlong prayer", () => {
    const long = "a".repeat(MAX_SUGGESTED_PRAYER_CHARS + 200);
    const clamped = clampResult(
      resolveModelOutput(baseOutput({ suggestedPrayer: long })),
    );
    expect(clamped.suggestedPrayer?.length).toBe(MAX_SUGGESTED_PRAYER_CHARS);
  });
});

describe("candidate selection by mode", () => {
  it("includes universal entries for every mode", () => {
    const universalVerse = SCRIPTURE_PACK.find((e) => !e.modes);
    expect(universalVerse).toBeDefined();
    for (const mode of ["free_flow", "regular", "lament", "rejoice"] as const) {
      const ids = scriptureCandidatesForMode(mode).map((e) => e.id);
      expect(ids).toContain(universalVerse!.id);
    }
  });

  it("excludes mode-restricted entries from non-matching modes", () => {
    const rejoiceOnly = SCRIPTURE_PACK.find(
      (e) => e.modes && !e.modes.includes("lament"),
    );
    expect(rejoiceOnly).toBeDefined();
    const lamentIds = scriptureCandidatesForMode("lament").map((e) => e.id);
    expect(lamentIds).not.toContain(rejoiceOnly!.id);
  });

  it("returns quote candidates scoped to the mode", () => {
    const universalQuote = QUOTE_PACK.find((e) => !e.modes);
    expect(universalQuote).toBeDefined();
    expect(quoteCandidatesForMode("rejoice").map((e) => e.id)).toContain(
      universalQuote!.id,
    );
  });
});
