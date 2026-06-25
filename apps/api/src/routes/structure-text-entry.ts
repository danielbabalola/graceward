import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  structureTextEntryRequestSchema,
  structureTextEntryResponseSchema,
  type StructureTextEntryResponse,
} from "@graceward/ai-schemas";
import { createOpenAiStructuringProvider } from "../ai/openai-structure-entry-provider.js";
import { AiError } from "../ai/types.js";
import {
  contentFlaggedError,
  createModerationGuard,
  entryFieldsText,
} from "../ai/moderation.js";
import type { EntryStructuringProvider } from "../ai/structure-entry-types.js";
import {
  ensureAiEnabled,
  ensureWithinQuota,
  resolveInstallId,
} from "../ai/access-guard.js";
import type { QuotaService } from "../ai/quota.js";
import { createRateLimiter, resolveRateLimitConfig } from "../rate-limit.js";
import { sendError } from "./send-error.js";

/**
 * POST /ai/structure-text-entry — cleans a single typed note into one
 * structured entry's fields (a tidy title/content plus suggested tags, and any
 * stated follow-up/by-when date). This is the typed counterpart to the
 * voice-entry route: no audio, no transcription — just the user's own text,
 * which is never persisted server-side and never logged.
 */
export function registerStructureTextEntryRoute(
  app: FastifyInstance,
  quota: QuotaService,
): void {
  const limiter = createRateLimiter(resolveRateLimitConfig());
  const sweepTimer = setInterval(() => limiter.sweep(), 60_000);
  sweepTimer.unref();

  app.post(
    "/ai/structure-text-entry",
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
          "text entry structuring rate limited",
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

      // Closed-beta access control: require a valid anonymous install ID.
      const installId = resolveInstallId(request, reply);
      if (!installId) {
        return;
      }

      const parsed = structureTextEntryRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        // Validation messages reference field names only, never the content.
        sendError(
          reply,
          request,
          400,
          "INVALID_REQUEST",
          "This note could not be polished because the request was invalid.",
        );
        return;
      }

      // Per-install daily quota — checked (not incremented) before the paid call.
      // Shares the "structure" bucket with the voice-entry route.
      if (!ensureWithinQuota(request, reply, quota, installId, "structure")) {
        return;
      }

      const moderation = createModerationGuard();

      let structuringProvider: EntryStructuringProvider;
      try {
        structuringProvider = createOpenAiStructuringProvider();
      } catch (error) {
        if (error instanceof AiError) {
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        throw error;
      }

      try {
        // Input moderation on the typed text, before the structuring call.
        // Fails open on a moderation outage (same rationale as the analyze
        // route); a genuine block returns a calm CONTENT_FLAGGED below.
        if (moderation) {
          const outcome = await moderation.check(parsed.data.text);
          if (outcome.status === "blocked") {
            request.log.warn(
              {
                requestId: request.id,
                code: "CONTENT_FLAGGED",
                stage: "input",
                categories: outcome.categories,
              },
              "text entry input flagged by moderation",
            );
            throw contentFlaggedError();
          }
          if (outcome.status === "unavailable") {
            request.log.warn(
              { requestId: request.id, code: "MODERATION_UNAVAILABLE", stage: "input" },
              "input moderation unavailable; proceeding",
            );
          }
        }

        const fields = await structuringProvider.structure({
          entryType: parsed.data.entryType,
          transcript: parsed.data.text,
          entryDate: parsed.data.entryDate,
        });

        // Output moderation on the structured fields.
        if (moderation) {
          const outcome = await moderation.check(entryFieldsText(fields));
          if (outcome.status === "blocked") {
            request.log.warn(
              {
                requestId: request.id,
                code: "CONTENT_FLAGGED",
                stage: "output",
                categories: outcome.categories,
              },
              "text entry output flagged by moderation",
            );
            throw contentFlaggedError();
          }
        }

        const candidate = {
          entryType: parsed.data.entryType,
          fields,
        };
        const validated = structureTextEntryResponseSchema.safeParse(candidate);
        if (!validated.success) {
          throw new AiError(
            "AI_INVALID_RESPONSE",
            502,
            "The polished entry did not match the expected shape.",
          );
        }

        // Count the call only after the full structuring succeeds.
        quota.record(installId, "structure");
        // Log only non-sensitive metadata — never the text or fields.
        request.log.info(
          {
            requestId: request.id,
            provider: structuringProvider.name,
            entryType: parsed.data.entryType,
          },
          "text entry structured",
        );

        const body: StructureTextEntryResponse = validated.data;
        return body;
      } catch (error) {
        if (error instanceof AiError) {
          request.log.warn(
            { requestId: request.id, code: error.code },
            "text entry structuring failed",
          );
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        request.log.error(
          { requestId: request.id, code: "AI_UNEXPECTED_ERROR" },
          "text entry structuring crashed",
        );
        sendError(
          reply,
          request,
          500,
          "AI_UNEXPECTED_ERROR",
          "Something went wrong while polishing this note.",
        );
        return;
      }
    },
  );
}
