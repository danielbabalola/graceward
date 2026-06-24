import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApiErrorBody } from "@graceward/ai-schemas";

/**
 * Sends the consistent API error envelope. Every error carries the request id
 * so logs and clients can be correlated without exposing any reflection,
 * audio, transcript, or provider content.
 */
export function sendError(
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
