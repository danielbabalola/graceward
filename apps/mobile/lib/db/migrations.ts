import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  planLegacyTagBackfill,
  type LegacyLabelRow,
} from "@/lib/tag-backfill";

type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

/**
 * Backfills the unified tag tables from the legacy single-label columns
 * (gratitudes.category, wins.faithfulness_theme, lessons.theme). The dedupe /
 * blank-skipping rule lives in the pure, dependency-free planLegacyTagBackfill
 * (so it can be unit-tested); this layer only reads rows and runs inserts.
 */
async function backfillTagsFromLegacyColumns(db: SQLiteDatabase): Promise<void> {
  const sources: { table: string; column: string; entryType: string }[] = [
    { table: "gratitudes", column: "category", entryType: "gratitude" },
    { table: "wins", column: "faithfulness_theme", entryType: "win" },
    { table: "lessons", column: "theme", entryType: "lesson" },
  ];

  const legacyRows: LegacyLabelRow[] = [];
  for (const source of sources) {
    const rows = await db.getAllAsync<{ id: string; label: string | null }>(
      `SELECT id, ${source.column} AS label FROM ${source.table}
        WHERE ${source.column} IS NOT NULL
          AND TRIM(${source.column}) <> ''
          AND deleted_at IS NULL`,
    );
    for (const row of rows) {
      legacyRows.push({
        entryType: source.entryType,
        entryId: row.id,
        label: row.label,
      });
    }
  }

  const plan = planLegacyTagBackfill(legacyRows);
  const slugToTagId = new Map<string, string>();
  const nowIso = new Date().toISOString();

  for (const tag of plan.tags) {
    const tagId = Crypto.randomUUID();
    slugToTagId.set(tag.slug, tagId);
    await db.runAsync(
      `INSERT INTO tags (id, name, slug, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, NULL)`,
      [tagId, tag.name, tag.slug, nowIso, nowIso],
    );
  }

  for (const link of plan.links) {
    const tagId = slugToTagId.get(link.slug);
    if (!tagId) {
      continue;
    }
    await db.runAsync(
      `INSERT OR IGNORE INTO entry_tags (
        id, tag_id, entry_type, entry_id, created_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, NULL)`,
      [Crypto.randomUUID(), tagId, link.entryType, link.entryId, nowIso],
    );
  }
}

const migrations: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS journal_entries (
          id TEXT PRIMARY KEY NOT NULL,
          entry_date TEXT NOT NULL,
          reflection_path TEXT NOT NULL,
          mode TEXT NOT NULL,
          input_type TEXT NOT NULL,
          raw_text TEXT,
          title TEXT,
          status TEXT NOT NULL,
          sync_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date
          ON journal_entries (entry_date);
        CREATE INDEX IF NOT EXISTS idx_journal_entries_mode
          ON journal_entries (mode);
        CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at
          ON journal_entries (created_at);
        CREATE INDEX IF NOT EXISTS idx_journal_entries_sync_status
          ON journal_entries (sync_status);
      `);
    },
  },
  {
    version: 2,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS audio_assets (
          id TEXT PRIMARY KEY NOT NULL,
          journal_entry_id TEXT NOT NULL,
          local_file_path TEXT NOT NULL,
          duration_seconds INTEGER,
          file_size_bytes INTEGER,
          mime_type TEXT,
          transcription_status TEXT NOT NULL,
          retention_policy TEXT NOT NULL,
          sync_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_audio_assets_journal_entry_id
          ON audio_assets (journal_entry_id);
        CREATE INDEX IF NOT EXISTS idx_audio_assets_transcription_status
          ON audio_assets (transcription_status);
      `);
    },
  },
  {
    version: 3,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS prayer_requests (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          source_journal_entry_id TEXT,
          status TEXT NOT NULL,
          follow_up_at TEXT,
          answered_at TEXT,
          answer_description TEXT,
          sync_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_prayer_requests_status
          ON prayer_requests (status);
        CREATE INDEX IF NOT EXISTS idx_prayer_requests_follow_up_at
          ON prayer_requests (follow_up_at);
        CREATE INDEX IF NOT EXISTS idx_prayer_requests_source_journal_entry_id
          ON prayer_requests (source_journal_entry_id);
      `);
    },
  },
  {
    version: 4,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS gratitudes (
          id TEXT PRIMARY KEY NOT NULL,
          journal_entry_id TEXT,
          content TEXT NOT NULL,
          category TEXT,
          sync_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_gratitudes_journal_entry_id
          ON gratitudes (journal_entry_id);
        CREATE INDEX IF NOT EXISTS idx_gratitudes_created_at
          ON gratitudes (created_at);
        CREATE INDEX IF NOT EXISTS idx_gratitudes_sync_status
          ON gratitudes (sync_status);
        CREATE INDEX IF NOT EXISTS idx_gratitudes_deleted_at
          ON gratitudes (deleted_at);

        CREATE TABLE IF NOT EXISTS wins (
          id TEXT PRIMARY KEY NOT NULL,
          journal_entry_id TEXT,
          content TEXT NOT NULL,
          faithfulness_theme TEXT,
          sync_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_wins_journal_entry_id
          ON wins (journal_entry_id);
        CREATE INDEX IF NOT EXISTS idx_wins_created_at
          ON wins (created_at);
        CREATE INDEX IF NOT EXISTS idx_wins_sync_status
          ON wins (sync_status);
        CREATE INDEX IF NOT EXISTS idx_wins_deleted_at
          ON wins (deleted_at);
      `);
    },
  },
  {
    version: 5,
    up: async (db) => {
      // Adds optional structured guided payload to journal entries. Existing
      // rows keep NULL and continue to render/edit via raw_text as before.
      await db.execAsync(`
        ALTER TABLE journal_entries ADD COLUMN structured_payload_json TEXT;
      `);
    },
  },
  {
    version: 6,
    up: async (db) => {
      // Caches AI reflection results locally so the user can revisit them
      // without re-sending the journal entry. Stores only the structured
      // result JSON and non-sensitive provider/model metadata — no secrets.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ai_reflection_results (
          id TEXT PRIMARY KEY NOT NULL,
          journal_entry_id TEXT NOT NULL,
          result_json TEXT NOT NULL,
          provider TEXT,
          model TEXT,
          created_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ai_reflection_results_journal_entry_id
          ON ai_reflection_results (journal_entry_id);
        CREATE INDEX IF NOT EXISTS idx_ai_reflection_results_created_at
          ON ai_reflection_results (created_at);
      `);
    },
  },
  {
    version: 7,
    up: async (db) => {
      // Local-only, device-scoped key/value preferences. Never synced and never
      // exported. Used (for now) to remember that the user acknowledged the AI
      // reflection privacy notice so it isn't shown on every analysis.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_preferences (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 8,
    up: async (db) => {
      // Local-only record of which AI suggestions the user has already saved, so
      // a saved prayer/gratitude/faithfulness card stays "saved" after leaving
      // and reopening the AI result screen. Stores no raw suggestion text — only
      // a content fingerprint plus references to the created local item. Never
      // synced. A unique index prevents duplicate saves of the same suggestion.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ai_saved_suggestions (
          id TEXT PRIMARY KEY NOT NULL,
          ai_reflection_result_id TEXT NOT NULL,
          journal_entry_id TEXT NOT NULL,
          suggestion_kind TEXT NOT NULL,
          suggestion_fingerprint TEXT NOT NULL,
          suggestion_index INTEGER,
          created_item_id TEXT,
          created_item_type TEXT,
          created_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ai_saved_suggestions_result_id
          ON ai_saved_suggestions (ai_reflection_result_id);
        CREATE INDEX IF NOT EXISTS idx_ai_saved_suggestions_journal_entry_id
          ON ai_saved_suggestions (journal_entry_id);
        CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_saved_suggestions_result_fingerprint
          ON ai_saved_suggestions (ai_reflection_result_id, suggestion_fingerprint);
      `);
    },
  },
  {
    version: 9,
    up: async (db) => {
      // Lessons: things the user is learning, noticing, or discerning with God.
      // Local-only user content, mirroring the gratitude/win tables plus a
      // title and an active/archived status (like prayer requests).
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS lessons (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          theme TEXT,
          source_journal_entry_id TEXT,
          status TEXT NOT NULL,
          sync_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_lessons_status
          ON lessons (status);
        CREATE INDEX IF NOT EXISTS idx_lessons_source_journal_entry_id
          ON lessons (source_journal_entry_id);
        CREATE INDEX IF NOT EXISTS idx_lessons_created_at
          ON lessons (created_at);
        CREATE INDEX IF NOT EXISTS idx_lessons_sync_status
          ON lessons (sync_status);
        CREATE INDEX IF NOT EXISTS idx_lessons_deleted_at
          ON lessons (deleted_at);
      `);
    },
  },
  {
    version: 10,
    up: async (db) => {
      // Unified tagging: a shared tag vocabulary linked many-to-many to every
      // content type via entry_tags. Existing single-label values (gratitude
      // category, faithfulness theme, lesson theme) are backfilled into tags so
      // nothing is lost; the legacy columns are left in place but unused.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_slug ON tags (slug);

        CREATE TABLE IF NOT EXISTS entry_tags (
          id TEXT PRIMARY KEY NOT NULL,
          tag_id TEXT NOT NULL,
          entry_type TEXT NOT NULL,
          entry_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS uq_entry_tags_entry_tag
          ON entry_tags (entry_type, entry_id, tag_id);
        CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id
          ON entry_tags (tag_id);
        CREATE INDEX IF NOT EXISTS idx_entry_tags_entry
          ON entry_tags (entry_type, entry_id);
      `);

      await backfillTagsFromLegacyColumns(db);
    },
  },
  {
    version: 11,
    up: async (db) => {
      // Instructions: things the user believes God has instructed or called
      // them to do, recorded in their own words. Manual only — never generated
      // by AI. Mirrors the lessons table plus an active/fulfilled status (where
      // "fulfilled" marks an instruction the user has acted on). Local-only.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS instructions (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          source_journal_entry_id TEXT,
          status TEXT NOT NULL,
          sync_status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_instructions_status
          ON instructions (status);
        CREATE INDEX IF NOT EXISTS idx_instructions_source_journal_entry_id
          ON instructions (source_journal_entry_id);
        CREATE INDEX IF NOT EXISTS idx_instructions_created_at
          ON instructions (created_at);
        CREATE INDEX IF NOT EXISTS idx_instructions_sync_status
          ON instructions (sync_status);
        CREATE INDEX IF NOT EXISTS idx_instructions_deleted_at
          ON instructions (deleted_at);
      `);
    },
  },
  {
    version: 12,
    up: async (db) => {
      // Optional, gentle "by when" target date for an instruction (the day the
      // user intends to act by). Nullable; existing rows keep NULL. Mirrors the
      // prayer follow-up date in spirit, but is never a hard/overdue deadline.
      await db.execAsync(`
        ALTER TABLE instructions ADD COLUMN due_at TEXT;
      `);
    },
  },
  {
    version: 13,
    up: async (db) => {
      // Generalizes the instructions table into the "Revelations" family —
      // things received or perceived from God (dreams, prophecies, and
      // instructions). The table keeps its physical name; a `kind` discriminator
      // distinguishes the three. Existing rows are all instructions, so the
      // column defaults to 'instruction' and backfills them in place. `due_at`
      // stays meaningful only for the instruction kind.
      await db.execAsync(`
        ALTER TABLE instructions ADD COLUMN kind TEXT NOT NULL DEFAULT 'instruction';
        CREATE INDEX IF NOT EXISTS idx_instructions_kind
          ON instructions (kind);
      `);
    },
  },
  {
    version: 14,
    up: async (db) => {
      // Optional "when it happened" date (YYYY-MM-DD) the user can set for the
      // reflective revelation kinds (the day a dream was had or a word received)
      // and for testimonies (the day a faithfulness moment occurred). Distinct
      // from created_at (when it was recorded); existing rows keep NULL and fall
      // back to their record date in the UI. Instructions keep using due_at.
      await db.execAsync(`
        ALTER TABLE instructions ADD COLUMN occurred_at TEXT;
        ALTER TABLE wins ADD COLUMN occurred_at TEXT;
      `);
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const currentVersion = result?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }
    await db.withTransactionAsync(async () => {
      await migration.up(db);
    });
    // PRAGMA statements cannot be parameterized; version is an internal integer.
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
  }
}
