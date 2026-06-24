import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  isSupportedTranscriptionMimeType,
  transcribeReflectionMetadataSchema,
  type TranscribeReflectionResponse,
} from "@graceward/ai-schemas";
import { createOpenAiTranscriptionProvider } from "../ai/openai-transcription-provider.js";
import { AiError } from "../ai/types.js";
import type { TranscriptionProvider } from "../ai/transcription-types.js";
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
      // Only the first "file" field is used; drain any others so the stream
      // completes without leaving dangling file handles.
      if (part.fieldname !== "file" || result.audio !== null) {
        part.file.resume();
        continue;
      }
      try {
        result.audio = await part.toBuffer();
      } catch {
        // Thrown when the per-file size limit is exceeded mid-stream.
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

export function registerTranscribeReflectionRoute(app: FastifyInstance): void {
  // Separate limiter instance from the analyze route so transcription (a slower,
  // paid call) gets its own ceiling. In-memory only, swept periodically.
  const limiter = createRateLimiter(resolveRateLimitConfig());
  const sweepTimer = setInterval(() => limiter.sweep(), 60_000);
  sweepTimer.unref();

  app.post(
    "/ai/transcribe-reflection",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rate = limiter.check(request.ip);
      if (!rate.allowed) {
        void reply.header("Retry-After", String(rate.retryAfterSeconds));
        request.log.warn(
          { requestId: request.id, code: "RATE_LIMITED" },
          "transcription rate limited",
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

      if (!request.isMultipart()) {
        sendError(
          reply,
          request,
          400,
          "INVALID_REQUEST",
          "The transcription request must be a multipart upload.",
        );
        return;
      }

      let upload: CollectedUpload;
      try {
        upload = await collectUpload(request);
      } catch {
        // A malformed multipart stream — never surface parser internals.
        sendError(
          reply,
          request,
          400,
          "INVALID_REQUEST",
          "The transcription upload could not be read.",
        );
        return;
      }

      if (upload.tooLarge) {
        sendError(
          reply,
          request,
          413,
          "FILE_TOO_LARGE",
          "This recording is too large to transcribe.",
        );
        return;
      }

      const metadata = transcribeReflectionMetadataSchema.safeParse(
        upload.fields,
      );
      if (!metadata.success) {
        sendError(
          reply,
          request,
          400,
          "INVALID_REQUEST",
          "The transcription request was missing required information.",
        );
        return;
      }

      if (!upload.audio) {
        sendError(
          reply,
          request,
          400,
          "NO_AUDIO_FILE",
          "No audio file was provided to transcribe.",
        );
        return;
      }

      if (!isSupportedTranscriptionMimeType(upload.mimeType)) {
        sendError(
          reply,
          request,
          415,
          "UNSUPPORTED_AUDIO",
          "This audio format can't be transcribed.",
        );
        return;
      }

      let provider: TranscriptionProvider;
      try {
        provider = createOpenAiTranscriptionProvider();
      } catch (error) {
        if (error instanceof AiError) {
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        throw error;
      }

      try {
        const { transcript, model } = await provider.transcribe({
          audio: upload.audio,
          filename: upload.filename,
          mimeType: upload.mimeType,
        });
        // Log only non-sensitive metadata — never the audio or transcript.
        request.log.info(
          { requestId: request.id, provider: provider.name, model },
          "reflection transcribed",
        );
        const body: TranscribeReflectionResponse = {
          transcript,
          provider: provider.name,
          model,
        };
        return body;
      } catch (error) {
        if (error instanceof AiError) {
          request.log.warn(
            { requestId: request.id, provider: provider.name, code: error.code },
            "transcription failed",
          );
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        request.log.error(
          { requestId: request.id, provider: provider.name, code: "AI_UNEXPECTED_ERROR" },
          "transcription crashed",
        );
        sendError(
          reply,
          request,
          500,
          "AI_UNEXPECTED_ERROR",
          "Something went wrong while transcribing the recording.",
        );
        return;
      }
    },
  );
}
