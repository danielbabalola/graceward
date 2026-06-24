import { AiError } from "./types.js";
import type {
  TranscriptionInput,
  TranscriptionProvider,
} from "./transcription-types.js";

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
// A current, low-cost OpenAI transcription model available through the audio
// transcriptions endpoint. Override with OPENAI_TRANSCRIPTION_MODEL.
const DEFAULT_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Resolves the transcription timeout from AI_PROVIDER_TIMEOUT_MS, falling back
 * to 60s (transcription is slower than chat). Ignores non-positive/non-numeric
 * values so a bad env var can't disable the timeout entirely.
 */
function resolveTimeoutMs(): number {
  const raw = Number(process.env.AI_PROVIDER_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

/**
 * OpenAI-backed transcription provider. Reads the API key from the server
 * environment only and posts the audio to OpenAI's transcription endpoint.
 * Throws AiError with non-sensitive codes; never logs or rethrows raw audio,
 * file paths, or transcript content.
 */
export function createOpenAiTranscriptionProvider(): TranscriptionProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiError(
      "AI_NOT_CONFIGURED",
      503,
      "AI service is not configured on the server.",
    );
  }
  const model = process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || DEFAULT_MODEL;

  return {
    name: "openai",
    model,
    async transcribe(input: TranscriptionInput) {
      const form = new FormData();
      form.append("model", model);
      // Ask for plain text so the response is just the transcript with no
      // additional metadata to parse.
      form.append("response_format", "text");
      form.append(
        "file",
        new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
        input.filename,
      );

      const controller = new AbortController();
      const timeoutMs = resolveTimeoutMs();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(OPENAI_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted) {
          throw new AiError(
            "AI_TIMEOUT",
            504,
            "The transcription service took too long to respond.",
          );
        }
        throw new AiError(
          "AI_PROVIDER_ERROR",
          502,
          "Could not reach the transcription provider.",
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        // The provider body may echo content; surface only a category.
        throw new AiError(
          "AI_PROVIDER_ERROR",
          502,
          "The transcription provider returned an error.",
        );
      }

      let transcript: string;
      try {
        transcript = (await response.text()).trim();
      } catch {
        throw new AiError(
          "AI_INVALID_RESPONSE",
          502,
          "The transcription response could not be read.",
        );
      }

      if (!transcript) {
        throw new AiError(
          "AI_INVALID_RESPONSE",
          502,
          "The transcription response was empty.",
        );
      }

      return { transcript, model };
    },
  };
}
