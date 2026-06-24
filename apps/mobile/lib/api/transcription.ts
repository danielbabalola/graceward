import type { TranscribeReflectionResponse } from "@graceward/ai-schemas";
import type { ApiErrorBody } from "@graceward/ai-schemas";
import { API_BASE_URL } from "./config";
import { AI_ACCESS_MESSAGES, buildInstallIdHeader } from "./ai-access";

export type TranscribeReflectionParams = {
  /** Local file URI of the audio recording to upload. */
  uri: string;
  /** Content type of the recording (e.g. "audio/m4a"). */
  mimeType: string;
  journalEntryId: string;
  audioAssetId: string;
};

export class TranscriptionApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TranscriptionApiError";
  }
}

/**
 * Client-side timeout for transcription. Sits above the server's transcription
 * provider floor (60s) so a real server-side AI_TIMEOUT surfaces with its own
 * copy, and this abort only trips when the network itself is unresponsive.
 */
const REQUEST_TIMEOUT_MS = 70_000;

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR:
    "Could not reach Graceward. Check your connection and try again.",
  TIMEOUT: "Transcription is taking longer than expected. Please try again.",
  AI_TIMEOUT:
    "Transcription took too long this time. Please try again in a moment.",
  RATE_LIMITED:
    "You've sent a lot just now. Please wait a moment, then try again.",
  AI_NOT_CONFIGURED:
    "Graceward's transcription service isn't set up yet. Please try again later.",
  AI_PROVIDER_ERROR:
    "Graceward's transcription service is unavailable right now. Please try again.",
  AI_INVALID_RESPONSE:
    "Graceward couldn't transcribe this recording just now. Please try again.",
  FILE_TOO_LARGE: "This recording is too large to transcribe.",
  UNSUPPORTED_AUDIO: "This recording's audio format can't be transcribed.",
  NO_AUDIO_FILE: "No audio could be found to transcribe.",
  INVALID_REQUEST: "This recording can't be transcribed.",
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
 * Uploads a single voice recording to the backend for transcription. Only
 * called after the user explicitly taps "Transcribe this reflection" and
 * confirms the privacy notice. Throws TranscriptionApiError with a
 * non-sensitive code on failure. Aborts after REQUEST_TIMEOUT_MS.
 */
export async function transcribeReflection(
  params: TranscribeReflectionParams,
): Promise<TranscribeReflectionResponse> {
  const installIdHeader = await buildInstallIdHeader();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const form = new FormData();
  form.append("journalEntryId", params.journalEntryId);
  form.append("audioAssetId", params.audioAssetId);
  // React Native's FormData accepts a file descriptor object for uploads.
  form.append("file", {
    uri: params.uri,
    name: filenameFromUri(params.uri),
    type: params.mimeType,
  } as unknown as Blob);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/ai/transcribe-reflection`, {
      method: "POST",
      headers: { ...installIdHeader },
      body: form,
      signal: controller.signal,
    });
  } catch {
    const code = controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR";
    throw new TranscriptionApiError(code, messageForCode(code));
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
    throw new TranscriptionApiError(code, messageForCode(code));
  }

  return (await response.json()) as TranscribeReflectionResponse;
}
