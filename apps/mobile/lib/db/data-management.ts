import type {
  AudioAsset,
  Gratitude,
  JournalEntry,
  Lesson,
  PrayerRequest,
  Revelation,
  Tag,
  Win,
} from "@graceward/shared";
import { deleteAllLocalAudio } from "@/lib/audio-storage";
import { deleteAllExports } from "@/lib/export-paths";
import type { ParsedImportData } from "@/lib/import-parse";
import { getDatabase } from "./client";
import { listAudioAssetsForExport } from "./audio";
import { listJournalEntries } from "./journal";
import { listPrayerRequests } from "./prayer";
import { listGratitudes } from "./gratitude";
import { listWins } from "./wins";
import { listLessons } from "./lessons";
import { listRevelations } from "./revelations";
import {
  listAllTags,
  listEntryTagsForExport,
  type EntryTagLinkExport,
} from "./tags";
import {
  listSavedSuggestionsForExport,
  type SavedSuggestionExport,
} from "./ai-saved-suggestions";

/**
 * A self-contained snapshot of all non-deleted local data. Faithfulness moments
 * are surfaced under a user-facing key (never "wins"). Audio is represented by
 * metadata only — no raw audio bytes are included.
 */
export type LocalDataExport = {
  app: "Graceward";
  exportedAt: string;
  schemaVersion: number;
  counts: {
    journalEntries: number;
    prayerRequests: number;
    gratitudes: number;
    faithfulnessMoments: number;
    lessons: number;
    revelations: number;
    audioAssets: number;
    savedAiSuggestions: number;
    tags: number;
  };
  journalEntries: JournalEntry[];
  prayerRequests: PrayerRequest[];
  gratitudes: Gratitude[];
  faithfulnessMoments: Win[];
  lessons: Lesson[];
  // Dreams, prophecies, and instructions (each row carries its `kind`).
  revelations: Revelation[];
  audioAssets: AudioAsset[];
  // Metadata only (kind + references + timestamps). No raw suggestion text.
  savedAiSuggestions: SavedSuggestionExport[];
  // The shared tag vocabulary and the links that apply tags to entries.
  tags: Tag[];
  entryTags: EntryTagLinkExport[];
};

/**
 * Gathers all non-deleted local records for export. Reads only; never writes,
 * uploads, or logs the gathered content.
 */
export async function listAllForExport(): Promise<LocalDataExport> {
  const db = await getDatabase();
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );

  const [
    journalEntries,
    prayerRequests,
    gratitudes,
    faithfulnessMoments,
    lessons,
    revelations,
    audioAssets,
    savedAiSuggestions,
    tags,
    entryTags,
  ] = await Promise.all([
    listJournalEntries(),
    listPrayerRequests(),
    listGratitudes(),
    listWins(),
    listLessons(),
    listRevelations(),
    listAudioAssetsForExport(),
    listSavedSuggestionsForExport(),
    listAllTags(),
    listEntryTagsForExport(),
  ]);

  return {
    app: "Graceward",
    exportedAt: new Date().toISOString(),
    schemaVersion: versionRow?.user_version ?? 0,
    counts: {
      journalEntries: journalEntries.length,
      prayerRequests: prayerRequests.length,
      gratitudes: gratitudes.length,
      faithfulnessMoments: faithfulnessMoments.length,
      lessons: lessons.length,
      revelations: revelations.length,
      audioAssets: audioAssets.length,
      savedAiSuggestions: savedAiSuggestions.length,
      tags: tags.length,
    },
    journalEntries,
    prayerRequests,
    gratitudes,
    faithfulnessMoments,
    lessons,
    revelations,
    audioAssets,
    savedAiSuggestions,
    tags,
    entryTags,
  };
}

/** Per-kind tally of how many rows were newly inserted by an import. */
export type ImportByType = {
  journalEntries: number;
  prayerRequests: number;
  gratitudes: number;
  faithfulnessMoments: number;
  lessons: number;
  revelations: number;
  tags: number;
  entryTags: number;
};

/** Outcome of an import: rows newly added vs. skipped (already present). */
export type ImportSummary = {
  imported: number;
  skipped: number;
  byType: ImportByType;
};

/**
 * Inserts the contents of a parsed export into the local database, preserving
 * the original ids and timestamps so the data lands exactly as it was. Safe to
 * run more than once: every insert is INSERT OR IGNORE, so a row that already
 * exists (matched by primary key, or a tag matched by its slug) is skipped
 * rather than duplicated. The whole import runs in a single transaction, so a
 * failure leaves the database unchanged.
 *
 * Tags are matched by slug first: if the device already has a tag with the same
 * slug under a different id, the imported tag links are rewired to that existing
 * tag instead of creating a duplicate. Audio recordings, AI reflection results,
 * and saved-suggestion markers are not imported (the parser drops them).
 */
export async function importLocalData(
  data: ParsedImportData,
): Promise<ImportSummary> {
  const db = await getDatabase();

  const byType: ImportByType = {
    journalEntries: 0,
    prayerRequests: 0,
    gratitudes: 0,
    faithfulnessMoments: 0,
    lessons: 0,
    revelations: 0,
    tags: 0,
    entryTags: 0,
  };
  let imported = 0;
  let skipped = 0;

  const tally = (changed: boolean, key: keyof ImportByType) => {
    if (changed) {
      imported += 1;
      byType[key] += 1;
    } else {
      skipped += 1;
    }
  };

  await db.withTransactionAsync(async () => {
    // Tags first so content links can be rewired to the effective tag id. Maps
    // each imported tag id to the id actually present after import (an existing
    // same-slug tag's id when one is already on the device).
    const tagIdMap = new Map<string, string>();
    for (const tag of data.tags) {
      const existing = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM tags WHERE slug = ?`,
        [tag.slug],
      );
      if (existing) {
        tagIdMap.set(tag.id, existing.id);
        skipped += 1;
        continue;
      }
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO tags (id, name, slug, created_at, updated_at, deleted_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [tag.id, tag.name, tag.slug, tag.createdAt, tag.updatedAt, null],
      );
      tagIdMap.set(tag.id, tag.id);
      tally(result.changes > 0, "tags");
    }

    for (const entry of data.journalEntries) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO journal_entries (
          id, entry_date, reflection_path, mode, input_type, raw_text, title,
          status, sync_status, created_at, updated_at, deleted_at,
          structured_payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.entryDate,
          entry.reflectionPath,
          entry.mode,
          entry.inputType,
          entry.rawText ?? null,
          entry.title ?? null,
          entry.status,
          entry.syncStatus,
          entry.createdAt,
          entry.updatedAt,
          entry.deletedAt ?? null,
          entry.structuredPayloadJson ?? null,
        ],
      );
      tally(result.changes > 0, "journalEntries");
    }

    for (const prayer of data.prayerRequests) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO prayer_requests (
          id, title, description, source_journal_entry_id, status, follow_up_at,
          answered_at, answer_description, sync_status, created_at, updated_at,
          deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prayer.id,
          prayer.title,
          prayer.description ?? null,
          prayer.sourceJournalEntryId ?? null,
          prayer.status,
          prayer.followUpAt ?? null,
          prayer.answeredAt ?? null,
          prayer.answerDescription ?? null,
          prayer.syncStatus,
          prayer.createdAt,
          prayer.updatedAt,
          prayer.deletedAt ?? null,
        ],
      );
      tally(result.changes > 0, "prayerRequests");
    }

    for (const gratitude of data.gratitudes) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO gratitudes (
          id, journal_entry_id, content, category, sync_status, created_at,
          updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gratitude.id,
          gratitude.journalEntryId ?? null,
          gratitude.content,
          gratitude.category ?? null,
          gratitude.syncStatus,
          gratitude.createdAt,
          gratitude.updatedAt,
          gratitude.deletedAt ?? null,
        ],
      );
      tally(result.changes > 0, "gratitudes");
    }

    for (const win of data.faithfulnessMoments) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO wins (
          id, journal_entry_id, content, faithfulness_theme, sync_status,
          created_at, updated_at, deleted_at, occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          win.id,
          win.journalEntryId ?? null,
          win.content,
          win.faithfulnessTheme ?? null,
          win.syncStatus,
          win.createdAt,
          win.updatedAt,
          win.deletedAt ?? null,
          win.occurredAt ?? null,
        ],
      );
      tally(result.changes > 0, "faithfulnessMoments");
    }

    for (const lesson of data.lessons) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO lessons (
          id, title, content, theme, source_journal_entry_id, status,
          sync_status, created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lesson.id,
          lesson.title,
          lesson.content,
          lesson.theme ?? null,
          lesson.sourceJournalEntryId ?? null,
          lesson.status,
          lesson.syncStatus,
          lesson.createdAt,
          lesson.updatedAt,
          lesson.deletedAt ?? null,
        ],
      );
      tally(result.changes > 0, "lessons");
    }

    // Revelations (dreams, prophecies, instructions) share the `instructions`
    // table; each row carries its own `kind`.
    for (const revelation of data.revelations) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO instructions (
          id, kind, title, content, due_at, occurred_at,
          source_journal_entry_id, status, sync_status, created_at, updated_at,
          deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          revelation.id,
          revelation.kind,
          revelation.title,
          revelation.content,
          revelation.dueAt ?? null,
          revelation.occurredAt ?? null,
          revelation.sourceJournalEntryId ?? null,
          revelation.status,
          revelation.syncStatus,
          revelation.createdAt,
          revelation.updatedAt,
          revelation.deletedAt ?? null,
        ],
      );
      tally(result.changes > 0, "revelations");
    }

    // Tag links last, rewired to the effective tag id. Links whose tag wasn't
    // part of the import are skipped so we never create a dangling reference.
    for (const link of data.entryTags) {
      const effectiveTagId = tagIdMap.get(link.tagId);
      if (!effectiveTagId) {
        skipped += 1;
        continue;
      }
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO entry_tags (
          id, tag_id, entry_type, entry_id, created_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, NULL)`,
        [link.id, effectiveTagId, link.entryType, link.entryId, link.createdAt],
      );
      tally(result.changes > 0, "entryTags");
    }
  });

  return { imported, skipped, byType };
}

/**
 * Permanently clears all local user data: every row in the local content tables
 * plus the on-device audio files. Device-local preferences are also reset (the
 * entire app_preferences table is cleared, including the AI reflection, voice
 * transcription, and voice-entry consent acknowledgements, and the anonymous AI
 * install ID) so the app feels fresh after a delete — each privacy notice will
 * show again the next time that action is used, and a new install ID is
 * generated on the next AI action. The schema and migration version are left
 * intact, so the app keeps working with empty states. Any previously exported
 * JSON snapshot is also removed so plaintext content never survives a delete.
 * This is a true delete (not a soft delete) and cannot be undone.
 */
export async function deleteAllLocalData(): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.execAsync(
      `DELETE FROM audio_assets;
       DELETE FROM journal_entries;
       DELETE FROM prayer_requests;
       DELETE FROM gratitudes;
       DELETE FROM wins;
       DELETE FROM lessons;
       DELETE FROM instructions;
       DELETE FROM ai_reflection_results;
       DELETE FROM ai_saved_suggestions;
       DELETE FROM entry_tags;
       DELETE FROM tags;
       DELETE FROM app_preferences;`,
    );
  });

  deleteAllLocalAudio();
  deleteAllExports();
}
