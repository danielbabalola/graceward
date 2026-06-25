import type {
  AudioAsset,
  Gratitude,
  Instruction,
  JournalEntry,
  Lesson,
  PrayerRequest,
  Tag,
  Win,
} from "@graceward/shared";
import { deleteAllLocalAudio } from "@/lib/audio-storage";
import { getDatabase } from "./client";
import { listAudioAssetsForExport } from "./audio";
import { listJournalEntries } from "./journal";
import { listPrayerRequests } from "./prayer";
import { listGratitudes } from "./gratitude";
import { listWins } from "./wins";
import { listLessons } from "./lessons";
import { listInstructions } from "./instructions";
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
    instructions: number;
    audioAssets: number;
    savedAiSuggestions: number;
    tags: number;
  };
  journalEntries: JournalEntry[];
  prayerRequests: PrayerRequest[];
  gratitudes: Gratitude[];
  faithfulnessMoments: Win[];
  lessons: Lesson[];
  instructions: Instruction[];
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
    instructions,
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
    listInstructions(),
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
      instructions: instructions.length,
      audioAssets: audioAssets.length,
      savedAiSuggestions: savedAiSuggestions.length,
      tags: tags.length,
    },
    journalEntries,
    prayerRequests,
    gratitudes,
    faithfulnessMoments,
    lessons,
    instructions,
    audioAssets,
    savedAiSuggestions,
    tags,
    entryTags,
  };
}

/**
 * Permanently clears all local user data: every row in the local content tables
 * plus the on-device audio files. Device-local preferences are also reset (the
 * entire app_preferences table is cleared, including the AI reflection, voice
 * transcription, and voice-entry consent acknowledgements, and the anonymous AI
 * install ID) so the app feels fresh after a delete — each privacy notice will
 * show again the next time that action is used, and a new install ID is
 * generated on the next AI action. The schema and migration version are left
 * intact, so the app keeps working with empty states. This is a true delete
 * (not a soft delete) and cannot be undone.
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
}
