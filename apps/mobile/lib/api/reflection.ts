import type { JournalEntry } from "@graceward/shared";
import type {
  AnalyzableMode,
  AnalyzeReflectionRequest,
  AnalyzeReflectionResponse,
  ApiErrorBody,
} from "@graceward/ai-schemas";
import { API_BASE_URL } from "./config";

const ANALYZABLE_MODES: readonly AnalyzableMode[] = [
  "free_flow",
  "regular",
  "lament",
  "rejoice",
];

/** True when an entry is eligible for AI reflection v1 (text only). */
export function canAnalyzeEntry(entry: JournalEntry): boolean {
  return buildAnalyzeRequest(entry) !== null;
}

/**
 * Builds the analyze request from a journal entry, or returns null when the
 * entry is not eligible (voice-only, empty text, or an unsupported mode).
 */
export function buildAnalyzeRequest(
  entry: JournalEntry,
): AnalyzeReflectionRequest | null {
  if (entry.inputType !== "text") {
    return null;
  }
  const rawText = entry.rawText?.trim();
  if (!rawText) {
    return null;
  }
  if (!ANALYZABLE_MODES.includes(entry.mode as AnalyzableMode)) {
    return null;
  }
  return {
    journalEntryId: entry.id,
    entryDate: entry.entryDate,
    mode: entry.mode as AnalyzableMode,
    inputType: "text",
    rawText,
  };
}

export class ReflectionApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ReflectionApiError";
  }
}

/**
 * Client-side request timeout. Sits a little above the server's default
 * provider timeout (30s) so a real server-side AI_TIMEOUT is usually surfaced
 * with its specific copy, and this abort only trips when the network itself is
 * unresponsive.
 */
const REQUEST_TIMEOUT_MS = 35_000;

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR:
    "Could not reach Graceward. Check your connection and try again.",
  TIMEOUT: "This is taking longer than expected. Please try again in a moment.",
  AI_TIMEOUT:
    "Graceward's reflection took too long this time. Please try again in a moment.",
  RATE_LIMITED:
    "You've reflected a lot just now. Please wait a moment, then try again.",
  AI_NOT_CONFIGURED:
    "Graceward's AI service isn't set up yet. Please try again later.",
  AI_PROVIDER_ERROR:
    "Graceward's AI service is unavailable right now. Please try again.",
  AI_INVALID_RESPONSE:
    "Graceward couldn't make sense of the reflection just now. Please try again.",
  INVALID_REQUEST: "This reflection can't be analyzed.",
};

function messageForCode(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

/**
 * Sends a single reflection to the backend for analysis. Only called after the
 * user explicitly consents on the AI reflection screen. Throws
 * ReflectionApiError with a non-sensitive code on failure. Aborts the request
 * after REQUEST_TIMEOUT_MS so a hung connection surfaces calm, honest copy.
 */
export async function analyzeReflection(
  request: AnalyzeReflectionRequest,
): Promise<AnalyzeReflectionResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/ai/analyze-reflection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch {
    // An aborted request is a client-side timeout; anything else is a generic
    // connectivity failure. Neither exposes server internals.
    const code = controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR";
    throw new ReflectionApiError(code, messageForCode(code));
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let code = "REQUEST_FAILED";
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body?.error?.code) {
        code = body.error.code;
      }
    } catch {
      // Ignore parse failures; fall back to the generic message.
    }
    throw new ReflectionApiError(code, messageForCode(code));
  }

  return (await response.json()) as AnalyzeReflectionResponse;
}
