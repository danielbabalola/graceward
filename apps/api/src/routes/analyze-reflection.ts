import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  analyzeReflectionRequestSchema,
  type AnalyzeReflectionResponse,
} from "@graceward/ai-schemas";
import { createOpenAiProvider } from "../ai/openai-provider.js";
import { AiError, type ReflectionAnalysisProvider } from "../ai/types.js";
import { createRateLimiter, resolveRateLimitConfig } from "../rate-limit.js";
import { sendError } from "./send-error.js";

export function registerAnalyzeReflectionRoute(app: FastifyInstance): void {
  // One limiter per process. In-memory only (see rate-limit.ts): no Redis or
  // external infra. A periodic sweep keeps the key map from growing unbounded;
  // unref() so it never keeps the process alive on its own.
  const limiter = createRateLimiter(resolveRateLimitConfig());
  const sweepTimer = setInterval(() => limiter.sweep(), 60_000);
  sweepTimer.unref();

  app.post(
    "/ai/analyze-reflection",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Rate limit by client IP (best available identity pre-auth). Checked
      // before any provider work so abusive clients are cheap to reject.
      const rate = limiter.check(request.ip);
      if (!rate.allowed) {
        void reply.header("Retry-After", String(rate.retryAfterSeconds));
        request.log.warn(
          { requestId: request.id, code: "RATE_LIMITED" },
          "reflection analysis rate limited",
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

      const parsed = analyzeReflectionRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        // Validation messages reference field names only, never the content.
        sendError(
          reply,
          request,
          400,
          "INVALID_REQUEST",
          "The reflection could not be analyzed because the request was invalid.",
        );
        return;
      }

      let provider: ReflectionAnalysisProvider;
      try {
        provider = createOpenAiProvider();
      } catch (error) {
        if (error instanceof AiError) {
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        throw error;
      }

      try {
        const result: AnalyzeReflectionResponse =
          await provider.analyze(parsed.data);
        // Log only non-sensitive metadata — never the reflection or AI content.
        request.log.info(
          { requestId: request.id, provider: provider.name, model: provider.model },
          "reflection analyzed",
        );
        return result;
      } catch (error) {
        if (error instanceof AiError) {
          request.log.warn(
            { requestId: request.id, provider: provider.name, code: error.code },
            "reflection analysis failed",
          );
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        request.log.error(
          { requestId: request.id, provider: provider.name, code: "AI_UNEXPECTED_ERROR" },
          "reflection analysis crashed",
        );
        sendError(
          reply,
          request,
          500,
          "AI_UNEXPECTED_ERROR",
          "Something went wrong while analyzing the reflection.",
        );
        return;
      }
    },
  );
}
