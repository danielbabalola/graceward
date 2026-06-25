import {
  MAX_TAGS_PER_ENTRY,
  voiceEntryFieldSchemas,
} from "@graceward/ai-schemas";
import {
  buildStructureSystemPrompt,
  buildStructureUserPrompt,
} from "./structure-entry-prompt.js";
import { AiError } from "./types.js";
import type {
  EntryStructuringProvider,
  VoiceEntryFields,
} from "./structure-entry-types.js";

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
 * OpenAI-backed entry-structuring provider. Reads the API key from the server
 * environment only and requests structured JSON output for a single entry
 * type. Throws AiError with non-sensitive codes; never logs or rethrows raw
 * transcript/provider content.
 */
export function createOpenAiStructuringProvider(): EntryStructuringProvider {
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
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT?.trim();

  return {
    name: "openai",
    model,
    async structure(input) {
      const requestBody: Record<string, unknown> = {
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildStructureSystemPrompt(input.entryType),
          },
          { role: "user", content: buildStructureUserPrompt(input) },
        ],
      };
      if (reasoningEffort) {
        requestBody.reasoning_effort = reasoningEffort;
      }

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

      const schema = voiceEntryFieldSchemas[input.entryType];
      const result = schema.safeParse(parsedJson);
      if (!result.success) {
        throw new AiError(
          "AI_INVALID_RESPONSE",
          502,
          "The AI response did not match the expected shape.",
        );
      }

      const data = result.data as VoiceEntryFields & { tags?: string[] };
      if (Array.isArray(data.tags)) {
        data.tags = data.tags.slice(0, MAX_TAGS_PER_ENTRY);
      }
      return data as VoiceEntryFields;
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
