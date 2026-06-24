import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  analyzeReflectionRequestSchema,
  type AnalyzeReflectionResponse,
  type ApiErrorBody,
} from "@graceward/ai-schemas";
import { createOpenAiProvider } from "../ai/openai-provider.js";
import { AiError, type ReflectionAnalysisProvider } from "../ai/types.js";

function sendError(
  reply: FastifyReply,
  request: FastifyRequest,
  status: number,
  code: string,
  message: string,
): void {
  const body: ApiErrorBody = {
    error: { code, message, requestId: request.id },
  };
  void reply.status(status).send(body);
}

export function registerAnalyzeReflectionRoute(app: FastifyInstance): void {
  app.post(
    "/ai/analyze-reflection",
    async (request: FastifyRequest, reply: FastifyReply) => {
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
          { provider: provider.name, model: provider.model },
          "reflection analyzed",
        );
        return result;
      } catch (error) {
        if (error instanceof AiError) {
          request.log.warn(
            { provider: provider.name, code: error.code },
            "reflection analysis failed",
          );
          sendError(reply, request, error.httpStatus, error.code, error.message);
          return;
        }
        request.log.error(
          { provider: provider.name, code: "AI_UNEXPECTED_ERROR" },
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
