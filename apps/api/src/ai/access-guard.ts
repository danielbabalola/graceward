import type { FastifyReply, FastifyRequest } from "fastify";
import {
  AI_DISABLED_CODE,
  AI_QUOTA_EXCEEDED_CODE,
  INSTALL_ID_HEADER,
  INSTALL_ID_REQUIRED_CODE,
  isValidInstallId,
} from "@graceward/ai-schemas";
import { sendError } from "../routes/send-error.js";
import type { QuotaKind, QuotaService } from "./quota.js";

/**
 * Emergency kill switch. AI endpoints are enabled unless AI_ENDPOINTS_ENABLED is
 * explicitly set to a false-y value (false/0/off/no). Defaults to enabled so a
 * missing var never silently disables AI in normal operation.
 */
export function aiEndpointsEnabled(): boolean {
  const raw = (process.env.AI_ENDPOINTS_ENABLED ?? "true").trim().toLowerCase();
  return !(raw === "false" || raw === "0" || raw === "off" || raw === "no");
}

/**
 * Short, non-sensitive prefix of an install ID for logs. The full ID is never
 * logged; a prefix is enough to correlate without storing the whole token.
 */
export function installIdFingerprint(installId: string): string {
  return installId.slice(0, 8);
}

/**
 * Kill-switch gate. Returns false (after sending AI_DISABLED) when AI endpoints
 * are turned off. Call first in every AI route, before any paid work.
 */
export function ensureAiEnabled(
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  if (aiEndpointsEnabled()) {
    return true;
  }
  request.log.warn(
    { requestId: request.id, code: AI_DISABLED_CODE },
    "AI endpoints disabled by kill switch",
  );
  sendError(
    reply,
    request,
    503,
    AI_DISABLED_CODE,
    "AI features are temporarily unavailable.",
  );
  return false;
}

/**
 * Reads and validates the install ID header. Returns the clean ID, or null
 * after sending INSTALL_ID_REQUIRED. Logs only that the header was missing or
 * invalid — never the (possibly malformed) value.
 */
export function resolveInstallId(
  request: FastifyRequest,
  reply: FastifyReply,
): string | null {
  const header = request.headers[INSTALL_ID_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  if (!isValidInstallId(value)) {
    request.log.warn(
      { requestId: request.id, code: INSTALL_ID_REQUIRED_CODE },
      "missing or invalid install id",
    );
    sendError(
      reply,
      request,
      401,
      INSTALL_ID_REQUIRED_CODE,
      "Graceward couldn't verify this app for AI features.",
    );
    return null;
  }
  return value.trim();
}

/**
 * Per-install quota gate. Returns true when under quota; otherwise sets a
 * Retry-After header and sends AI_QUOTA_EXCEEDED. Read-only: it never
 * increments the count (call quotaService.record only after a paid call
 * succeeds).
 */
export function ensureWithinQuota(
  request: FastifyRequest,
  reply: FastifyReply,
  quota: QuotaService,
  installId: string,
  kind: QuotaKind,
): boolean {
  const decision = quota.check(installId, kind);
  if (decision.allowed) {
    return true;
  }
  void reply.header("Retry-After", String(decision.retryAfterSeconds));
  request.log.warn(
    {
      requestId: request.id,
      code: AI_QUOTA_EXCEEDED_CODE,
      install: installIdFingerprint(installId),
      reason: decision.reason,
    },
    "ai quota exceeded",
  );
  sendError(
    reply,
    request,
    429,
    AI_QUOTA_EXCEEDED_CODE,
    "You've reached today's AI limit for this beta. Please try again tomorrow.",
  );
  return false;
}
