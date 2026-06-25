import {
  MAX_FOLLOW_UP_QUESTIONS,
  MAX_SUGGESTED_PRAYER_CHARS,
  MAX_SUGGESTIONS_PER_KIND,
  MAX_TAGS_PER_ENTRY,
  reflectionModelOutputSchema,
  type AnalyzeReflectionResponse,
  type ReflectionModelOutput,
} from "@graceward/ai-schemas";
import { buildUserPrompt, REFLECTION_SYSTEM_PROMPT } from "./prompt.js";
import { resolveScripture } from "./scripture-pack.js";
import { resolveQuote } from "./quote-pack.js";
import { AiError, type ReflectionAnalysisProvider } from "./types.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Resolves the provider timeout from AI_PROVIDER_TIMEOUT_MS, falling back to
 * 30s. Ignores non-positive or non-numeric values so a bad env var can't
 * disable the timeout entirely.
 */
function resolveTimeoutMs(): number {
  const raw = Number(process.env.AI_PROVIDER_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

/**
 * OpenAI-backed reflection analysis provider. Reads the API key from the
 * server environment only and requests structured JSON output. Throws AiError
 * with non-sensitive codes; never logs or rethrows raw reflection/provider
 * content.
 */
export function createOpenAiProvider(): ReflectionAnalysisProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiError(
      "AI_NOT_CONFIGURED",
      503,
      "AI service is not configured on the server.",
    );
  }
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  // Optional, for reasoning models (gpt-5.x): minimal | low | medium | high.
  // Left unset for non-reasoning models (e.g. gpt-4o-mini), which reject it.
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT?.trim();

  return {
    name: "openai",
    model,
    async analyze(input) {
      // Note: temperature is intentionally omitted. Reasoning models (gpt-5.x)
      // reject non-default temperature, so leaving it at the provider default
      // keeps this provider compatible across both model families.
      const requestBody: Record<string, unknown> = {
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: REFLECTION_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
      };
      if (reasoningEffort) {
        requestBody.reasoning_effort = reasoningEffort;
      }

      // Bound the provider call so a slow/hung upstream can't hold the request
      // open indefinitely. AbortController fires after the resolved timeout.
      const controller = new AbortController();
      const timeoutMs = resolveTimeoutMs();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(OPENAI_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } catch {
        // Distinguish a timeout (we aborted) from a generic connectivity error.
        // Neither path surfaces provider internals, secrets, or content.
        if (controller.signal.aborted) {
          throw new AiError(
            "AI_TIMEOUT",
            504,
            "The AI service took too long to respond.",
          );
        }
        throw new AiError(
          "AI_PROVIDER_ERROR",
          502,
          "Could not reach the AI provider.",
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        // Provider body may echo content; surface only a category, never body.
        throw new AiError(
          "AI_PROVIDER_ERROR",
          502,
          "The AI provider returned an error.",
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new AiError(
          "AI_INVALID_RESPONSE",
          502,
          "The AI response could not be read.",
        );
      }

      const content = extractMessageContent(payload);
      if (!content) {
        throw new AiError(
          "AI_INVALID_RESPONSE",
          502,
          "The AI response was empty.",
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(content);
      } catch {
        throw new AiError(
          "AI_INVALID_RESPONSE",
          502,
          "The AI response was not valid JSON.",
        );
      }

      const result = reflectionModelOutputSchema.safeParse(parsedJson);
      if (!result.success) {
        throw new AiError(
          "AI_INVALID_RESPONSE",
          502,
          "The AI response did not match the expected shape.",
        );
      }

      return clampResult(resolveModelOutput(result.data));
    },
  };
}

function extractMessageContent(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = choices[0];
  if (typeof first !== "object" || first === null) {
    return null;
  }
  const message = (first as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) {
    return null;
  }
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

/**
 * Builds the public response from the validated model output by resolving the
 * model-chosen `scriptureId`/`quoteId` to canonical entries from the curated
 * packs. The model never authors verse/quote text, so an unknown or null id
 * simply omits that section — the wording can never be fabricated. The
 * suggested prayer is model-authored and passes through (trimmed/clamped later).
 */
export function resolveModelOutput(
  output: ReflectionModelOutput,
): AnalyzeReflectionResponse {
  const { scriptureId, quoteId, ...rest } = output;

  const response: AnalyzeReflectionResponse = { ...rest };

  const scripture = resolveScripture(scriptureId);
  if (scripture) {
    response.scripture = {
      reference: scripture.reference,
      text: scripture.text,
      translation: scripture.translation,
      theme: scripture.themes[0],
    };
  }

  const quote = resolveQuote(quoteId);
  if (quote) {
    response.quote = {
      text: quote.text,
      author: quote.author,
      ...(quote.source ? { source: quote.source } : {}),
    };
  }

  return response;
}

/** Caps a suggestion's optional tag array to the per-entry maximum. */
function clampTags<T extends { tags?: string[] }>(item: T): T {
  if (!item.tags) {
    return item;
  }
  return { ...item, tags: item.tags.slice(0, MAX_TAGS_PER_ENTRY) };
}

/**
 * Normalizes the model-authored suggested prayer: trims surrounding whitespace,
 * caps the length defensively, and drops it entirely when empty so the client
 * never renders a blank prayer card.
 */
function clampSuggestedPrayer(prayer: string | undefined): string | undefined {
  if (typeof prayer !== "string") {
    return undefined;
  }
  const trimmed = prayer.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, MAX_SUGGESTED_PRAYER_CHARS);
}

/** Defensive cap on list sizes regardless of what the model returns. Exported
 * for unit testing the caps in isolation. */
export function clampResult(
  result: AnalyzeReflectionResponse,
): AnalyzeReflectionResponse {
  return {
    ...result,
    suggestedPrayer: clampSuggestedPrayer(result.suggestedPrayer),
    prayerSuggestions: result.prayerSuggestions
      .slice(0, MAX_SUGGESTIONS_PER_KIND)
      .map(clampTags),
    gratitudeSuggestions: result.gratitudeSuggestions
      .slice(0, MAX_SUGGESTIONS_PER_KIND)
      .map(clampTags),
    faithfulnessMomentSuggestions: result.faithfulnessMomentSuggestions
      .slice(0, MAX_SUGGESTIONS_PER_KIND)
      .map(clampTags),
    lessonSuggestions: result.lessonSuggestions
      .slice(0, MAX_SUGGESTIONS_PER_KIND)
      .map(clampTags),
    instructionSuggestions: result.instructionSuggestions
      .slice(0, MAX_SUGGESTIONS_PER_KIND)
      .map(clampTags),
    gentleFollowUpQuestions: result.gentleFollowUpQuestions.slice(
      0,
      MAX_FOLLOW_UP_QUESTIONS,
    ),
  };
}
