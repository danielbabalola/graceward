import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  isSupportedTranscriptionMimeType,
  MAX_VOICE_ENTRY_TRANSCRIPT_CHARS,
  structureVoiceEntryMetadataSchema,
  structureVoiceEntryResponseSchema,
  type StructureVoiceEntryResponse,
} from "@graceward/ai-schemas";
import { createOpenAiTranscriptionProvider } from "../ai/openai-transcription-provider.js";
import { createOpenAiStructuringProvider } from "../ai/openai-structure-entry-provider.js";
import { AiError } from "../ai/types.js";
import type { TranscriptionProvider } from "../ai/transcription-types.js";
import type { EntryStructuringProvider } from "../ai/structure-entry-types.js";
import {
  ensureAiEnabled,
  ensureWithinQuota,
  resolveInstallId,
} from "../ai/access-guard.js";
import type { QuotaService } from "../ai/quota.js";
import { createRateLimiter, resolveRateLimitConfig } from "../rate-limit.js";
import { sendError } from "./send-error.js";

type CollectedUpload = {
  audio: Buffer | null;
  filename: string;
  mimeType: string;
  tooLarge: boolean;
  fields: Record<string, string>;
};

/**
 * Streams the multipart request, buffering the single audio file and the text
 * metadata fields. Reads at most one file. Never logs the audio, its bytes, or
 * any file path. Returns a flag when the upload exceeds the configured size so
 * the caller can respond with a calm "too large" error.
 */
async function collectUpload(request: FastifyRequest): Promise<CollectedUpload> {
  const result: CollectedUpload = {
    audio: null,
    filename: "audio",
    mimeType: "",
    tooLarge: false,
    fields: {},
  };

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (part.fieldname !== "file" || result.audio !== null) {
        part.file.resume();
        continue;
      }
      try {
        result.audio = await part.toBuffer();
      } catch {
        result.tooLarge = true;
        result.audio = null;
      }
      if (part.file.truncated) {
        result.tooLarge = true;
        result.audio = null;
      }
      result.filename =
        typeof part.filename === "string" && part.filename.length > 0
          ? part.filename
          : "audio";
      result.mimeType = part.mimetype;
    } else if (typeof part.value === "string") {
      result.fields[part.fieldname] = part.value;
    }
  }

  return result;
}

/**
 * POST /ai/structure-voice-entry — turns a single spoken note into one
 * structured entry. The audio is transcribed and then organized into the
 * requested entry type's fields (e.g. a prayer's title/description/follow-up).
 * Neither the audio nor the transcript is persisted server-side; both exist
 * only for the duration of the request and are never logged.
 */
export function registerStructureVoiceEntryRoute(
  app: FastifyInstance,
  quota: QuotaService,
): void {
  // Own limiter instance: this route makes two paid AI calls (transcription +
  // structuring), so it gets its own ceiling.
  const limiter = createRateLimiter(resolveRateLimitConfig());
  const sweepTimer = setInterval(() => limiter.sweep(), 60_000);
  sweepTimer.unref();

  app.post(
    "/ai/structure-voice-entry",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Emergency kill switch first — before any other work or paid call.
      if (!ensureAiEnabled(request, reply)) {
        return;
      }

      const rate = limiter.check(request.ip);
      if (!rate.allowed) {
        void reply.header("Retry-After", String(rate.retryAfterSeconds));
        request.log.warn(
          { requestId: request.id, code: "RATE_LIMITED" },
          "voice entry structuring rate limited",
        );
        sendError(
          reply,
          request,
          429,
          "RATE_LIMITED",
          "Too many requests. Please wait a moment and try again.",
        );
        return;
      }

      // Closed-beta access control: require a valid anonymous install ID
      // (validated from the header before parsing the upload).
      const installId = resolveInstallId(request, reply);
      if (!installId) {
        return;
      }

      if (!request.isMultipart()) {
        sendError(
          reply,
          request,
          400,
          "INVALID_REQUEST",
          "The request must be a multipart upload.",
        );
        return;
      }

      let upload: CollectedUpload;
      try {
        upload = await collectUpload(request);
      } catch {
        sendError(
          reply,
          request,
          400,
          "INVALID_REQUEST",
          "The upload could not be read.",
        );
        return;
      }

      if (upload.tooLarge) {
        sendError(
          reply,
          request,
          413,
          "FILE_TOO_LARGE",
          "This recording is too large to process.",
        );
        return;
      }

      const metadata = structureVoiceEntryMetadataSchema.safeParse(
        upload.fields,
      );
      if (!metadata.success) {
        sendError(
          reply,
          request,
          400,
          "INVALID_REQUEST",
          "The request was missing required information.",
        );
        return;
      }

      if (!upload.audio) {
        sendError(
          reply,
          request,
          400,
          "NO_AUDIO_FILE",
          "No audio file was provided.",
        );
        return;
      }

      if (!isSupportedTranscriptionMimeType(upload.mimeType)) {
        sendError(
          reply,
          request,
          415,
          "UNSUPPORTED_AUDIO",
          "This audio format can't be processed.",
        );
        return;
      }

      // Per-install daily quota — checked (not incremented) after the upload is
      // validated and before either paid provider call (transcribe + structure).
      if (!ensureWithinQuota(request, reply, quota, installId, "structure")) {
        return;
      }

      let transcriptionProvider: TranscriptionProvider;
      let structuringProvider: EntryStructuringProvider;
      try {
        transcriptionProvider = createOpenAiTranscriptionProvider();
        structuringProvider = createOpenAiStructuringProvider();
      } catch (error) {
        if (error instanceof AiError) {
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        throw error;
      }

      try {
        const { transcript: rawTranscript } =
          await transcriptionProvider.transcribe({
            audio: upload.audio,
            filename: upload.filename,
            mimeType: upload.mimeType,
          });
        // Bound the transcript before structuring so an unexpectedly long
        // transcription can't drive an oversized chat request.
        const transcript = rawTranscript
          .trim()
          .slice(0, MAX_VOICE_ENTRY_TRANSCRIPT_CHARS);

        const fields = await structuringProvider.structure({
          entryType: metadata.data.entryType,
          transcript,
          entryDate: metadata.data.entryDate,
        });

        const candidate = {
          entryType: metadata.data.entryType,
          transcript,
          fields,
        };
        const validated = structureVoiceEntryResponseSchema.safeParse(candidate);
        if (!validated.success) {
          throw new AiError(
            "AI_INVALID_RESPONSE",
            502,
            "The structured entry did not match the expected shape.",
          );
        }

        // Count the call only after the full structuring succeeds (this route
        // makes two paid calls but counts as a single "structure" unit).
        quota.record(installId, "structure");
        // Log only non-sensitive metadata — never audio, transcript, or fields.
        request.log.info(
          {
            requestId: request.id,
            provider: structuringProvider.name,
            entryType: metadata.data.entryType,
          },
          "voice entry structured",
        );

        const body: StructureVoiceEntryResponse = validated.data;
        return body;
      } catch (error) {
        if (error instanceof AiError) {
          request.log.warn(
            { requestId: request.id, code: error.code },
            "voice entry structuring failed",
          );
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        request.log.error(
          { requestId: request.id, code: "AI_UNEXPECTED_ERROR" },
          "voice entry structuring crashed",
        );
        sendError(
          reply,
          request,
          500,
          "AI_UNEXPECTED_ERROR",
          "Something went wrong while processing the recording.",
        );
        return;
      }
    },
  );
}
