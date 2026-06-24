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
