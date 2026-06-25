import type { AnalyzeReflectionResponse } from "@graceward/ai-schemas";
import { AiError } from "./types.js";
import type { VoiceEntryFields } from "./structure-entry-types.js";

const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";
const DEFAULT_MODERATION_MODEL = "omni-moderation-latest";
const DEFAULT_MODERATION_TIMEOUT_MS = 10_000;

/**
 * Stable, non-sensitive error code returned when content (user input or model
 * output) is blocked by moderation. Surfaced to the client so it can show calm,
 * specific copy.
 */
export const CONTENT_FLAGGED_CODE = "CONTENT_FLAGGED";

/**
 * Calm copy used for both input- and output-side blocks. It deliberately
 * neither accuses the user nor explains which category tripped — it simply says
 * the companion can't respond, and reassures that the entry is still theirs.
 */
export const CONTENT_FLAGGED_MESSAGE =
  "Graceward's companion can't respond to this entry. You can still keep it privately in your journal.";

/**
 * Moderation categories that block by default. These represent content with no
 * legitimate place in a personal reflection (abuse/exploitation or threats
 * toward others). Categories that a hurting believer may legitimately bring to
 * God — self-harm, violence experienced, sexual sin/struggle, anger — are
 * intentionally NOT blocked here so lament, confession, and the pastoral crisis
 * path (safetyNote) keep working. Override with AI_MODERATION_BLOCK_CATEGORIES.
 */
const DEFAULT_BLOCK_CATEGORIES = [
  "sexual/minors",
  "harassment/threatening",
  "hate/threatening",
  "illicit/violent",
] as const;

/** Outcome of a moderation check. "unavailable" means it could not run. */
export type ModerationOutcome =
  | { status: "allowed" }
  | { status: "blocked"; categories: string[] }
  | { status: "unavailable" };

export interface ModerationGuard {
  /** Checks text and never throws on network/provider errors (fails open to
   * "unavailable"); the caller decides how to treat an unavailable result. */
  check(text: string): Promise<ModerationOutcome>;
}

/**
 * Moderation is on by default whenever the provider is configured. Set
 * AI_MODERATION_ENABLED to a false-y value (false/0/off/no) to turn it off.
 */
function moderationEnabled(): boolean {
  const raw = (process.env.AI_MODERATION_ENABLED ?? "true").trim().toLowerCase();
  return !(raw === "false" || raw === "0" || raw === "off" || raw === "no");
}

/** Resolves the blocking category set from env, falling back to the defaults. */
function resolveBlockCategories(): Set<string> {
  const raw = process.env.AI_MODERATION_BLOCK_CATEGORIES?.trim();
  if (!raw) {
    return new Set(DEFAULT_BLOCK_CATEGORIES);
  }
  const parsed = raw
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c) => c.length > 0);
  return parsed.length > 0 ? new Set(parsed) : new Set(DEFAULT_BLOCK_CATEGORIES);
}

function resolveTimeoutMs(): number {
  const raw = Number(process.env.AI_MODERATION_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MODERATION_TIMEOUT_MS;
}

/**
 * Creates a moderation guard, or returns null when moderation is disabled or
 * the provider is not configured (no API key). Mirrors the provider factories:
 * config is read from the server environment only.
 */
export function createModerationGuard(): ModerationGuard | null {
  if (!moderationEnabled()) {
    return null;
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  const model = process.env.AI_MODERATION_MODEL?.trim() || DEFAULT_MODERATION_MODEL;
  const blockCategories = resolveBlockCategories();

  return {
    async check(text: string): Promise<ModerationOutcome> {
      const trimmed = text?.trim();
      if (!trimmed) {
        return { status: "allowed" };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs());

      let response: Response;
      try {
        response = await fetch(OPENAI_MODERATION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, input: trimmed }),
          signal: controller.signal,
        });
      } catch {
        // Network error or timeout: fail open so a moderation outage never
        // silently breaks the pastoral path. The caller logs the unavailability.
        return { status: "unavailable" };
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        return { status: "unavailable" };
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return { status: "unavailable" };
      }

      const flagged = extractFlaggedCategories(payload, blockCategories);
      if (flagged === null) {
        return { status: "unavailable" };
      }
      return flagged.length > 0
        ? { status: "blocked", categories: flagged }
        : { status: "allowed" };
    },
  };
}

/**
 * Reads the moderation response and returns the blocking categories that fired,
 * or null when the response shape can't be understood (treated as unavailable).
 */
function extractFlaggedCategories(
  payload: unknown,
  blockCategories: Set<string>,
): string[] | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }
  const first = results[0];
  if (typeof first !== "object" || first === null) {
    return null;
  }
  const categories = (first as { categories?: unknown }).categories;
  if (typeof categories !== "object" || categories === null) {
    return null;
  }
  const flagged: string[] = [];
  for (const [name, value] of Object.entries(categories as Record<string, unknown>)) {
    if (value === true && blockCategories.has(name.toLowerCase())) {
      flagged.push(name);
    }
  }
  return flagged;
}

/**
 * Throws a CONTENT_FLAGGED AiError. Shared by the routes so input- and
 * output-side blocks return the same calm envelope.
 */
export function contentFlaggedError(): AiError {
  return new AiError(CONTENT_FLAGGED_CODE, 422, CONTENT_FLAGGED_MESSAGE);
}

/** Flattens an analysis response into the text the model authored, for an
 * output-side moderation pass. */
export function analysisOutputText(result: AnalyzeReflectionResponse): string {
  const parts: string[] = [result.pastoralReflection];
  for (const p of result.prayerSuggestions) {
    parts.push(p.title, p.description);
  }
  for (const g of result.gratitudeSuggestions) {
    parts.push(g.content);
  }
  for (const f of result.faithfulnessMomentSuggestions) {
    parts.push(f.content);
  }
  for (const l of result.lessonSuggestions) {
    parts.push(l.title, l.content);
  }
  for (const i of result.instructionSuggestions) {
    parts.push(i.title, i.content);
  }
  parts.push(...result.gentleFollowUpQuestions);
  if (result.safetyNote) {
    parts.push(result.safetyNote);
  }
  return parts.filter((p) => p.length > 0).join("\n");
}

/** Flattens a structured entry's fields into text for an output-side
 * moderation pass. Handles every entry-type shape via duck typing. */
export function entryFieldsText(fields: VoiceEntryFields): string {
  const f = fields as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ["title", "description", "content"]) {
    const value = f[key];
    if (typeof value === "string" && value.length > 0) {
      parts.push(value);
    }
  }
  return parts.join("\n");
}
