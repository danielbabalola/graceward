import * as Crypto from "expo-crypto";
import type {
  FaithfulnessMomentSuggestion,
  GratitudeSuggestion,
  PrayerSuggestion,
} from "@graceward/ai-schemas";
import { getDatabase } from "./client";

/** Which list a saved suggestion came from (user-facing kinds). */
export type SuggestionKind = "prayer" | "gratitude" | "faithfulness_moment";

/** The local item created when a suggestion is saved. */
export type CreatedItemType = "prayer_request" | "gratitude" | "win";

/**
 * Small, deterministic FNV-1a hash → hex. Used to build a compact fingerprint
 * of a suggestion's original content so we never store raw suggestion text in
 * the saved-state table, while still matching the same suggestion on reload.
 */
function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts; keep it unsigned.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function canonical(parts: (string | null | undefined)[]): string {
  return parts
    .map((part) => (part ?? "").trim().toLowerCase())
    .join("\u0001");
}

/**
 * Stable fingerprint for a suggestion, derived from its kind + original content
 * (not the array index, so reordering can't mismatch). The same AI result JSON
 * always yields the same fingerprint.
 */
export function prayerSuggestionFingerprint(s: PrayerSuggestion): string {
  return `prayer:${fnv1aHex(canonical([s.title, s.description, s.followUpAt]))}`;
}

export function gratitudeSuggestionFingerprint(s: GratitudeSuggestion): string {
  return `gratitude:${fnv1aHex(canonical([s.content, s.category]))}`;
}

export function faithfulnessSuggestionFingerprint(
  s: FaithfulnessMomentSuggestion,
): string {
  return `faithfulness_moment:${fnv1aHex(
    canonical([s.content, s.faithfulnessTheme]),
  )}`;
}

export type MarkAiSuggestionSavedInput = {
  aiReflectionResultId: string;
  journalEntryId: string;
  suggestionKind: SuggestionKind;
  suggestionFingerprint: string;
  suggestionIndex: number;
  createdItemId: string;
  createdItemType: CreatedItemType;
};

/**
 * Records that a suggestion was saved. Idempotent: a duplicate (same result +
 * fingerprint) is ignored via the unique index, so a suggestion can't be
 * double-saved. Stores no raw suggestion text.
 */
export async function markAiSuggestionSaved(
  input: MarkAiSuggestionSavedInput,
): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO ai_saved_suggestions (
      id, ai_reflection_result_id, journal_entry_id, suggestion_kind,
      suggestion_fingerprint, suggestion_index, created_item_id,
      created_item_type, created_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Crypto.randomUUID(),
      input.aiReflectionResultId,
      input.journalEntryId,
      input.suggestionKind,
      input.suggestionFingerprint,
      input.suggestionIndex,
      input.createdItemId,
      input.createdItemType,
      nowIso,
      null,
    ],
  );
}

/**
 * Fingerprints of suggestions already saved for a given AI result. Used to
 * restore each card's saved state when the result screen is reopened.
 */
export async function listSavedSuggestionFingerprints(
  aiReflectionResultId: string,
): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ suggestion_fingerprint: string }>(
    `SELECT suggestion_fingerprint FROM ai_saved_suggestions
      WHERE ai_reflection_result_id = ? AND deleted_at IS NULL`,
    [aiReflectionResultId],
  );
  return rows.map((row) => row.suggestion_fingerprint);
}

/** Non-sensitive saved-suggestion metadata for export (no raw content). */
export type SavedSuggestionExport = {
  id: string;
  aiReflectionResultId: string;
  journalEntryId: string;
  suggestionKind: SuggestionKind;
  createdItemType: CreatedItemType | null;
  createdAt: string;
};

type SavedSuggestionRow = {
  id: string;
  ai_reflection_result_id: string;
  journal_entry_id: string;
  suggestion_kind: string;
  created_item_type: string | null;
  created_at: string;
};

export async function listSavedSuggestionsForExport(): Promise<
  SavedSuggestionExport[]
> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SavedSuggestionRow>(
    `SELECT id, ai_reflection_result_id, journal_entry_id, suggestion_kind,
            created_item_type, created_at
       FROM ai_saved_suggestions
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC`,
  );
  return rows.map((row) => ({
    id: row.id,
    aiReflectionResultId: row.ai_reflection_result_id,
    journalEntryId: row.journal_entry_id,
    suggestionKind: row.suggestion_kind as SuggestionKind,
    createdItemType: (row.created_item_type as CreatedItemType | null) ?? null,
    createdAt: row.created_at,
  }));
}
