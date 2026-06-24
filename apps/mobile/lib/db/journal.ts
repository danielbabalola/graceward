import * as Crypto from "expo-crypto";
import type {
  CreateJournalEntryInput,
  JournalEntry,
} from "@graceward/shared";
import { getDatabase } from "./client";
import { deriveTitle, toLocalDateString } from "./helpers";
import { softDeleteAudioAssetsForEntry } from "./audio";

type JournalEntryRow = {
  id: string;
  entry_date: string;
  reflection_path: string;
  mode: string;
  input_type: string;
  raw_text: string | null;
  title: string | null;
  status: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRow(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    reflectionPath: row.reflection_path as JournalEntry["reflectionPath"],
    mode: row.mode as JournalEntry["mode"],
    inputType: row.input_type as JournalEntry["inputType"],
    rawText: row.raw_text,
    title: row.title,
    status: row.status as JournalEntry["status"],
    syncStatus: row.sync_status as JournalEntry["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createJournalEntry(
  input: CreateJournalEntryInput,
): Promise<JournalEntry> {
  const db = await getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();

  const rawText = input.rawText ?? null;
  const derivedTitle =
    input.title ?? (rawText ? deriveTitle(rawText) : null);

  const entry: JournalEntry = {
    id: Crypto.randomUUID(),
    entryDate: input.entryDate ?? toLocalDateString(now),
    reflectionPath: input.reflectionPath,
    mode: input.mode,
    inputType: input.inputType,
    rawText,
    title: derivedTitle,
    status: input.status ?? "saved",
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO journal_entries (
      id, entry_date, reflection_path, mode, input_type, raw_text, title,
      status, sync_status, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.entryDate,
      entry.reflectionPath,
      entry.mode,
      entry.inputType,
      entry.rawText,
      entry.title,
      entry.status,
      entry.syncStatus,
      entry.createdAt,
      entry.updatedAt,
      entry.deletedAt,
    ],
  );

  return entry;
}

export async function listJournalEntries(): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<JournalEntryRow>(
    `SELECT * FROM journal_entries
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function listJournalEntriesByDate(
  entryDate: string,
): Promise<JournalEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<JournalEntryRow>(
    `SELECT * FROM journal_entries
      WHERE entry_date = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [entryDate],
  );
  return rows.map(mapRow);
}

export async function listJournalEntryDatesForMonth(
  year: number,
  monthIndex: number,
): Promise<string[]> {
  const db = await getDatabase();
  const startInclusive = toLocalDateString(new Date(year, monthIndex, 1));
  const endExclusive = toLocalDateString(new Date(year, monthIndex + 1, 1));
  const rows = await db.getAllAsync<{ entry_date: string }>(
    `SELECT DISTINCT entry_date FROM journal_entries
      WHERE deleted_at IS NULL
        AND entry_date >= ?
        AND entry_date < ?`,
    [startInclusive, endExclusive],
  );
  return rows.map((row) => row.entry_date);
}

export async function getJournalEntryById(
  id: string,
): Promise<JournalEntry | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<JournalEntryRow>(
    `SELECT * FROM journal_entries WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export type UpdateJournalEntryInput = {
  rawText: string;
};

export async function updateJournalEntry(
  id: string,
  input: UpdateJournalEntryInput,
): Promise<JournalEntry | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  const title = deriveTitle(input.rawText);

  await db.runAsync(
    `UPDATE journal_entries
      SET raw_text = ?, title = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [input.rawText, title, nowIso, id],
  );

  return getJournalEntryById(id);
}

export async function softDeleteJournalEntry(id: string): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  await db.runAsync(
    `UPDATE journal_entries
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, nowIso, id],
  );

  await softDeleteAudioAssetsForEntry(id);
}
