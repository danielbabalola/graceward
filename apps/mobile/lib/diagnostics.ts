/**
 * Pure helpers for the Help & Feedback area. These build the *safe* text that a
 * tester can copy or email during the closed beta. They never touch the
 * database, audio files, AI output, or any secret.
 *
 * Everything here is intentionally Expo-free so it can be unit-tested without a
 * React Native runtime. The Expo-aware part (reading version/platform/API URL)
 * lives in `lib/app-info.ts`.
 *
 * Safety rules baked in:
 *  - Only safe app/device metadata is ever formatted.
 *  - No journal / prayer / gratitude / faithfulness / transcript / audio content.
 *  - No API keys or secrets. The API URL is reduced to its host (no path,
 *    query, or credentials) before it appears anywhere.
 */

// TODO(beta): replace with the real support inbox before sharing the beta.
export const SUPPORT_EMAIL = "TODO_SUPPORT_EMAIL@example.com";

export const APP_NAME = "Graceward";
export const APP_TAGLINE = "Pause. Reflect. Remember God's faithfulness.";

export type ApiEnvironment = "local" | "dev" | "production" | "unknown";

/**
 * Safe, non-identifying metadata describing this install. Intentionally has no
 * field for user content.
 */
export type DiagnosticInfo = {
  appName: string;
  appVersion: string | null;
  buildNumber: string | null;
  platform: string | null;
  osVersion: string | null;
  apiHost: string;
  apiEnvironment: ApiEnvironment;
  timestamp: string;
};

/**
 * Reduce an API base URL to just its host (optionally with port). Drops the
 * scheme, path, query, and any embedded credentials so nothing sensitive can
 * ride along. Returns "redacted" if the input can't be understood.
 */
export function redactApiUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) {
    return "redacted";
  }
  try {
    const { host } = new URL(rawUrl);
    return host || "redacted";
  } catch {
    // Best-effort fallback for inputs the URL parser rejects: strip scheme and
    // keep only the authority segment before the first slash.
    const withoutScheme = rawUrl.replace(/^[a-zA-Z][\w+.-]*:\/\//, "");
    const host = withoutScheme.split(/[/?#]/)[0]?.trim();
    return host && host.length > 0 ? host : "redacted";
  }
}

/**
 * Classify an API base URL into a coarse environment label so a bug report can
 * note "local / dev / production" without exposing a full URL or any secret.
 */
export function describeApiEnvironment(
  rawUrl: string | null | undefined,
): ApiEnvironment {
  const host = redactApiUrl(rawUrl);
  if (host === "redacted") {
    return "unknown";
  }
  const hostname = host.split(":")[0]!.toLowerCase();

  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return "local";
  }

  // Private / LAN ranges (physical-device dev against a Mac on Wi-Fi).
  const isPrivateIp =
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
  if (isPrivateIp) {
    return "dev";
  }

  const usesHttps = /^https:\/\//i.test(rawUrl ?? "");
  return usesHttps ? "production" : "dev";
}

/**
 * Format the safe diagnostic block shared via "Copy diagnostic info". Includes
 * only app/device metadata and a redacted API host — never user content.
 */
export function formatDiagnostics(info: DiagnosticInfo): string {
  const lines = [
    `${info.appName} diagnostics`,
    `Version: ${info.appVersion ?? "unknown"}`,
    `Build: ${info.buildNumber ?? "unknown"}`,
    `Platform: ${info.platform ?? "unknown"}`,
    `OS: ${info.osVersion ?? "unknown"}`,
    `API environment: ${info.apiEnvironment}`,
    `API host: ${info.apiHost}`,
    `Captured: ${info.timestamp}`,
  ];
  return lines.join("\n");
}

const BUG_REPORT_CHECKLIST = [
  "Please describe:",
  "1. What were you doing?",
  "2. What happened?",
  "3. What did you expect to happen?",
].join("\n");

/**
 * Body for a "Report a bug" email/clipboard entry: a short prompt for the
 * tester followed by the safe diagnostic block. No user content is included.
 */
export function buildBugReportBody(info: DiagnosticInfo): string {
  return [
    BUG_REPORT_CHECKLIST,
    "",
    "— — —",
    "App details (safe to share, no personal content):",
    formatDiagnostics(info),
  ].join("\n");
}

/**
 * Body for a "Send feedback" email. Kept light and free-form; no diagnostics or
 * device metadata are attached unless the tester adds them themselves.
 */
export function buildFeedbackBody(): string {
  return [
    "What's working well, and what could be better?",
    "",
    "(Your feedback is read by the Graceward team. Please don't include",
    "anything private from your reflections — just your thoughts on the app.)",
  ].join("\n");
}

/**
 * Build a safely-encoded `mailto:` URL. Subject and body are percent-encoded so
 * newlines and spaces survive being handed to the mail client.
 */
export function buildMailtoUrl(
  email: string,
  subject: string,
  body: string,
): string {
  const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${email}?${params}`;
}
