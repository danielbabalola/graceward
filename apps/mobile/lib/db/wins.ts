import * as Crypto from "expo-crypto";
import type { CreateWinInput, UpdateWinInput, Win } from "@graceward/shared";
import { getDatabase } from "./client";

type WinRow = {
  id: string;
  journal_entry_id: string | null;
  content: string;
  faithfulness_theme: string | null;
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
    faithfulnessTheme: input.faithfulnessTheme ?? null,
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO wins (
      id, journal_entry_id, content, faithfulness_theme, sync_status,
      created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      win.id,
      win.journalEntryId,
      win.content,
      win.faithfulnessTheme,
      win.syncStatus,
      win.createdAt,
      win.updatedAt,
      win.deletedAt,
    ],
  );

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
  if (input.faithfulnessTheme !== undefined) {
    sets.push("faithfulness_theme = ?");
    values.push(input.faithfulnessTheme);
  }

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE wins SET ${sets.join(", ")}
      WHERE id = ? AND deleted_at IS NULL`,
    values,
  );

  return getWinById(id);
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
