/**
 * Pure, dependency-free constants for the closed-beta AI access-control layer.
 * Kept separate from ai-access.ts (which touches the local DB to read/create the
 * install ID) so these can be unit-tested without pulling in Expo/SQLite.
 */

/**
 * Header carrying the anonymous, on-device install ID with AI requests. Kept in
 * sync with INSTALL_ID_HEADER in @graceward/ai-schemas (defined as a literal
 * here so the mobile bundle doesn't pull in the server's zod schemas).
 */
export const INSTALL_ID_HEADER = "X-Graceward-Install-Id";

/**
 * Calm, user-facing copy for the closed-beta AI access-control errors. Shared by
 * every AI client so the wording is consistent. These never expose quota
 * internals or anything alarming.
 */
export const AI_ACCESS_MESSAGES: Record<string, string> = {
  AI_DISABLED: "Graceward's AI features are temporarily unavailable.",
  AI_QUOTA_EXCEEDED:
    "You've reached today's AI limit for this beta. Try again tomorrow.",
  INSTALL_ID_REQUIRED:
    "Graceward couldn't verify this app for AI features just now. Please try again.",
};
