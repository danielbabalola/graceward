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

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR:
    "Could not reach Graceward. Check your connection and try again.",
  AI_NOT_CONFIGURED:
    "Graceward's AI service isn't set up yet. Please try again later.",
  AI_PROVIDER_ERROR:
    "Graceward's AI service had trouble responding. Please try again.",
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
 * ReflectionApiError with a non-sensitive code on failure.
 */
export async function analyzeReflection(
  request: AnalyzeReflectionRequest,
): Promise<AnalyzeReflectionResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/ai/analyze-reflection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ReflectionApiError("NETWORK_ERROR", messageForCode("NETWORK_ERROR"));
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
