import * as Crypto from "expo-crypto";
import type {
  CreateGratitudeInput,
  Gratitude,
  UpdateGratitudeInput,
} from "@graceward/shared";
import { getDatabase } from "./client";
import { listTagsForEntry, setEntryTags } from "./tags";

/** Names of the tags applied to a gratitude (replaces the old `category`). */
function legacyTagNames(input: { tags?: string[]; category?: string | null }): string[] {
  if (input.tags !== undefined) {
    return input.tags;
  }
  return input.category ? [input.category] : [];
}

type GratitudeRow = {
  id: string;
  journal_entry_id: string | null;
  content: string;
  category: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRow(row: GratitudeRow): Gratitude {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    content: row.content,
    category: row.category,
    syncStatus: row.sync_status as Gratitude["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createGratitude(
  input: CreateGratitudeInput,
): Promise<Gratitude> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  const gratitude: Gratitude = {
    id: Crypto.randomUUID(),
    journalEntryId: input.journalEntryId ?? null,
    content: input.content,
    // Legacy column is no longer written; tags are the source of truth.
    category: null,
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO gratitudes (
      id, journal_entry_id, content, category, sync_status, created_at,
      updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      gratitude.id,
      gratitude.journalEntryId,
      gratitude.content,
      gratitude.category,
      gratitude.syncStatus,
      gratitude.createdAt,
      gratitude.updatedAt,
      gratitude.deletedAt,
    ],
  );

  const tagNames = legacyTagNames(input);
  if (tagNames.length > 0) {
    await setEntryTags("gratitude", gratitude.id, tagNames);
  }

  return gratitude;
}

export async function listGratitudes(): Promise<Gratitude[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GratitudeRow>(
    `SELECT * FROM gratitudes
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function listRecentGratitudes(limit = 5): Promise<Gratitude[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GratitudeRow>(
    `SELECT * FROM gratitudes
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map(mapRow);
}

export async function listGratitudesByJournalEntryId(
  journalEntryId: string,
): Promise<Gratitude[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GratitudeRow>(
    `SELECT * FROM gratitudes
      WHERE journal_entry_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [journalEntryId],
  );
  return rows.map(mapRow);
}

export async function getMostRecentGratitude(): Promise<Gratitude | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GratitudeRow>(
    `SELECT * FROM gratitudes
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  return row ? mapRow(row) : null;
}

export async function getGratitudeById(
  id: string,
): Promise<Gratitude | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GratitudeRow>(
    `SELECT * FROM gratitudes WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function updateGratitude(
  id: string,
  input: UpdateGratitudeInput,
): Promise<Gratitude | null> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (input.content !== undefined) {
    sets.push("content = ?");
    values.push(input.content);
  }

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE gratitudes SET ${sets.join(", ")}
      WHERE id = ? AND deleted_at IS NULL`,
    values,
  );

  if (input.tags !== undefined || input.category !== undefined) {
    await setEntryTags("gratitude", id, legacyTagNames(input));
  }

  return getGratitudeById(id);
}

/** Tag names currently applied to a gratitude. */
export async function getGratitudeTagNames(id: string): Promise<string[]> {
  const tags = await listTagsForEntry("gratitude", id);
  return tags.map((tag) => tag.name);
}

export async function softDeleteGratitude(id: string): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE gratitudes
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, nowIso, id],
  );
}
