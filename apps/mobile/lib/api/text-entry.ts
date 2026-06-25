import type {
  ApiErrorBody,
  StructurableEntryType,
  StructureTextEntryResponse,
} from "@graceward/ai-schemas";
import { API_BASE_URL } from "./config";
import { AI_ACCESS_MESSAGES, buildInstallIdHeader } from "./ai-access";

export type StructureTextEntryParams = {
  /** Which kind of entry the typed note should be structured into. */
  entryType: StructurableEntryType;
  /** Today's local date (YYYY-MM-DD) so any stated follow-up time resolves. */
  entryDate: string;
  /** The user's typed note to clean up and structure. */
  text: string;
};

export class TextEntryApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TextEntryApiError";
  }
}

/**
 * Client-side timeout. This request does a single server-side structuring call,
 * so it sits comfortably above that floor; this abort only trips when the
 * network itself is unresponsive.
 */
const REQUEST_TIMEOUT_MS = 45_000;

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR:
    "Could not reach Graceward. Check your connection and try again.",
  TIMEOUT: "This is taking longer than expected. Please try again in a moment.",
  AI_TIMEOUT:
    "Graceward took too long this time. Please try again in a moment.",
  RATE_LIMITED:
    "You've sent a lot just now. Please wait a moment, then try again.",
  AI_NOT_CONFIGURED:
    "Graceward's writing helper isn't set up yet. Please try again later.",
  AI_PROVIDER_ERROR:
    "Graceward's writing helper is unavailable right now. Please try again.",
  AI_INVALID_RESPONSE:
    "Graceward couldn't make sense of this just now. Please try again.",
  CONTENT_FLAGGED:
    "Graceward's companion can't polish this entry. You can still keep it privately in your journal.",
  INVALID_REQUEST: "This note can't be polished.",
  ...AI_ACCESS_MESSAGES,
};

function messageForCode(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

/**
 * Sends the user's typed note to the backend, where it is cleaned up and
 * organized into the requested entry type's fields. Only called after the user
 * explicitly taps "Polish with AI" and confirms the privacy notice. Throws
 * TextEntryApiError with a non-sensitive code on failure. Aborts after
 * REQUEST_TIMEOUT_MS.
 */
export async function structureTextEntry(
  params: StructureTextEntryParams,
): Promise<StructureTextEntryResponse> {
  const installIdHeader = await buildInstallIdHeader();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/ai/structure-text-entry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...installIdHeader,
      },
      body: JSON.stringify({
        entryType: params.entryType,
        entryDate: params.entryDate,
        text: params.text,
      }),
      signal: controller.signal,
    });
  } catch {
    const code = controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR";
    throw new TextEntryApiError(code, messageForCode(code));
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
    throw new TextEntryApiError(code, messageForCode(code));
  }

  return (await response.json()) as StructureTextEntryResponse;
}
