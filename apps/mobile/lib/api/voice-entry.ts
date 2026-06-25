import type {
  ApiErrorBody,
  StructureVoiceEntryResponse,
  VoiceEntryType,
} from "@graceward/ai-schemas";
import { API_BASE_URL } from "./config";
import { AI_ACCESS_MESSAGES, buildInstallIdHeader } from "./ai-access";

export type StructureVoiceEntryParams = {
  /** Local file URI of the audio recording to upload. */
  uri: string;
  /** Content type of the recording (e.g. "audio/m4a"). */
  mimeType: string;
  /** Which kind of entry the spoken note should be structured into. */
  entryType: VoiceEntryType;
  /** Today's local date (YYYY-MM-DD) so spoken follow-up times resolve. */
  entryDate: string;
};

export class VoiceEntryApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VoiceEntryApiError";
  }
}

/**
 * Client-side timeout. This request does two server-side AI calls in sequence
 * (transcription, then structuring), so it sits above their combined server
 * floors; this abort only trips when the network itself is unresponsive.
 */
const REQUEST_TIMEOUT_MS = 95_000;

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR:
    "Could not reach Graceward. Check your connection and try again.",
  TIMEOUT: "This is taking longer than expected. Please try again in a moment.",
  AI_TIMEOUT:
    "Graceward took too long this time. Please try again in a moment.",
  RATE_LIMITED:
    "You've sent a lot just now. Please wait a moment, then try again.",
  AI_NOT_CONFIGURED:
    "Graceward's voice service isn't set up yet. Please try again later.",
  AI_PROVIDER_ERROR:
    "Graceward's voice service is unavailable right now. Please try again.",
  AI_INVALID_RESPONSE:
    "Graceward couldn't make sense of this recording just now. Please try again.",
  CONTENT_FLAGGED:
    "Graceward's companion can't respond to this recording. You can still keep it privately in your journal.",
  FILE_TOO_LARGE: "This recording is too large to process.",
  UNSUPPORTED_AUDIO: "This recording's audio format can't be processed.",
  NO_AUDIO_FILE: "No audio could be found to process.",
  INVALID_REQUEST: "This recording can't be processed.",
  ...AI_ACCESS_MESSAGES,
};

function messageForCode(code: string): string {
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
}

/** Best-effort filename for the upload part, derived from the local URI. */
function filenameFromUri(uri: string): string {
  const last = uri.split("/").pop();
  return last && last.length > 0 ? last : "recording.m4a";
}

/**
 * Uploads a single spoken note to the backend, where it is transcribed and
 * organized into the requested entry type's fields. Only called after the user
 * explicitly taps "Use this recording" and confirms the privacy notice. Throws
 * VoiceEntryApiError with a non-sensitive code on failure. Aborts after
 * REQUEST_TIMEOUT_MS.
 */
export async function structureVoiceEntry(
  params: StructureVoiceEntryParams,
): Promise<StructureVoiceEntryResponse> {
  const installIdHeader = await buildInstallIdHeader();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const form = new FormData();
  form.append("entryType", params.entryType);
  form.append("entryDate", params.entryDate);
  // React Native's FormData accepts a file descriptor object for uploads.
  form.append("file", {
    uri: params.uri,
    name: filenameFromUri(params.uri),
    type: params.mimeType,
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/ai/structure-voice-entry`, {
      method: "POST",
      headers: { ...installIdHeader },
      body: form,
      signal: controller.signal,
    });
  } catch {
    const code = controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR";
    throw new VoiceEntryApiError(code, messageForCode(code));
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
    throw new VoiceEntryApiError(code, messageForCode(code));
  }

  return (await response.json()) as StructureVoiceEntryResponse;
}
