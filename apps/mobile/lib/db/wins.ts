import * as Crypto from "expo-crypto";
import type { CreateWinInput, UpdateWinInput, Win } from "@graceward/shared";
import { getDatabase } from "./client";
import { listTagsForEntry, setEntryTags } from "./tags";

function legacyTagNames(input: {
  tags?: string[];
  faithfulnessTheme?: string | null;
}): string[] {
  if (input.tags !== undefined) {
    return input.tags;
  }
  return input.faithfulnessTheme ? [input.faithfulnessTheme] : [];
}

type WinRow = {
  id: string;
  journal_entry_id: string | null;
  content: string;
  faithfulness_theme: string | null;
  occurred_at: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRow(row: WinRow): Win {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    content: row.content,
    faithfulnessTheme: row.faithfulness_theme,
    occurredAt: row.occurred_at,
    syncStatus: row.sync_status as Win["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createWin(input: CreateWinInput): Promise<Win> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  const win: Win = {
    id: Crypto.randomUUID(),
    journalEntryId: input.journalEntryId ?? null,
    content: input.content,
    // Legacy column is no longer written; tags are the source of truth.
    faithfulnessTheme: null,
    occurredAt: input.occurredAt ?? null,
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO wins (
      id, journal_entry_id, content, faithfulness_theme, occurred_at,
      sync_status, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      win.id,
      win.journalEntryId,
      win.content,
      win.faithfulnessTheme,
      win.occurredAt,
      win.syncStatus,
      win.createdAt,
      win.updatedAt,
      win.deletedAt,
    ],
  );

  const tagNames = legacyTagNames(input);
  if (tagNames.length > 0) {
    await setEntryTags("win", win.id, tagNames);
  }

  return win;
}

export async function listWins(): Promise<Win[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WinRow>(
    `SELECT * FROM wins
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function listRecentWins(limit = 5): Promise<Win[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WinRow>(
    `SELECT * FROM wins
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map(mapRow);
}

export async function listWinsByJournalEntryId(
  journalEntryId: string,
): Promise<Win[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WinRow>(
    `SELECT * FROM wins
      WHERE journal_entry_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [journalEntryId],
  );
  return rows.map(mapRow);
}

/**
 * Most recent faithfulness moment. Internally these are stored in the `wins`
 * table; user-facing language always says "faithfulness moment", never "win".
 */
export async function getMostRecentWin(): Promise<Win | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<WinRow>(
    `SELECT * FROM wins
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  return row ? mapRow(row) : null;
}

export async function getWinById(id: string): Promise<Win | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<WinRow>(
    `SELECT * FROM wins WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function updateWin(
  id: string,
  input: UpdateWinInput,
): Promise<Win | null> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (input.content !== undefined) {
    sets.push("content = ?");
    values.push(input.content);
  }
  if (input.occurredAt !== undefined) {
    sets.push("occurred_at = ?");
    values.push(input.occurredAt);
  }

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE wins SET ${sets.join(", ")}
      WHERE id = ? AND deleted_at IS NULL`,
    values,
  );

  if (input.tags !== undefined || input.faithfulnessTheme !== undefined) {
    await setEntryTags("win", id, legacyTagNames(input));
  }

  return getWinById(id);
}

/** Tag names currently applied to a faithfulness moment (win). */
export async function getWinTagNames(id: string): Promise<string[]> {
  const tags = await listTagsForEntry("win", id);
  return tags.map((tag) => tag.name);
}

export async function softDeleteWin(id: string): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE wins
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, nowIso, id],
  );
}
