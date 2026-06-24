import type { SQLiteDatabase } from "expo-sqlite";

type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

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
