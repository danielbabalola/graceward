import * as Crypto from "expo-crypto";
import type {
  CreateRevelationInput,
  Revelation,
  RevelationKind,
  RevelationStatus,
  UpdateRevelationInput,
} from "@graceward/shared";
import { getDatabase } from "./client";
import { toLocalDateString } from "./helpers";
import { listTagsForEntry, setEntryTags } from "./tags";

type RevelationRow = {
  id: string;
  kind: string;
  title: string;
  content: string;
  due_at: string | null;
  occurred_at: string | null;
  source_journal_entry_id: string | null;
  status: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRow(row: RevelationRow): Revelation {
  return {
    id: row.id,
    kind: row.kind as RevelationKind,
    title: row.title,
    content: row.content,
    dueAt: row.due_at,
    occurredAt: row.occurred_at,
    sourceJournalEntryId: row.source_journal_entry_id,
    status: row.status as RevelationStatus,
    syncStatus: row.sync_status as Revelation["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** Reads just the kind of a revelation, used to scope its tag links. */
async function getRevelationKind(id: string): Promise<RevelationKind | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ kind: string }>(
    `SELECT kind FROM instructions WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? (row.kind as RevelationKind) : null;
}

export async function createRevelation(
  input: CreateRevelationInput,
): Promise<Revelation> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  const revelation: Revelation = {
    id: Crypto.randomUUID(),
    kind: input.kind,
    title: input.title,
    content: input.content,
    // A "by when" date only applies to instructions; dreams/prophecies ignore it.
    dueAt: input.kind === "instruction" ? (input.dueAt ?? null) : null,
    // An "occurred" date is for the reflective kinds (dream/prophecy); an
    // instruction tracks time via due_at, not when it was received.
    occurredAt: input.kind === "instruction" ? null : (input.occurredAt ?? null),
    sourceJournalEntryId: input.sourceJournalEntryId ?? null,
    status: input.status ?? "active",
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO instructions (
      id, kind, title, content, due_at, occurred_at, source_journal_entry_id,
      status, sync_status, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      revelation.id,
      revelation.kind,
      revelation.title,
      revelation.content,
      revelation.dueAt,
      revelation.occurredAt,
      revelation.sourceJournalEntryId,
      revelation.status,
      revelation.syncStatus,
      revelation.createdAt,
      revelation.updatedAt,
      revelation.deletedAt,
    ],
  );

  if (input.tags !== undefined && input.tags.length > 0) {
    await setEntryTags(input.kind, revelation.id, input.tags);
  }

  return revelation;
}

/** All non-deleted revelations, newest first. Used for export and broad reads. */
export async function listRevelations(): Promise<Revelation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RevelationRow>(
    `SELECT * FROM instructions
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

/** All non-deleted revelations of a single kind, newest first. */
export async function listRevelationsByKind(
  kind: RevelationKind,
): Promise<Revelation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RevelationRow>(
    `SELECT * FROM instructions
      WHERE kind = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [kind],
  );
  return rows.map(mapRow);
}

/**
 * Selects the single instruction to surface on the Today screen.
 *
 * Preference order (mirrors getPrayerFocus):
 * 1. An active instruction whose "by when" date is today or earlier (soonest /
 *    most overdue first), so the user is gently reminded of one to revisit.
 * 2. Otherwise the most recently created active instruction.
 *
 * Scoped to the instruction kind only — dreams and prophecies are reflective,
 * not actionable, so they never appear as "What I'm Being Asked".
 */
export async function getInstructionFocus(): Promise<Revelation | null> {
  const db = await getDatabase();
  const today = toLocalDateString(new Date());

  const due = await db.getFirstAsync<RevelationRow>(
    `SELECT * FROM instructions
      WHERE kind = 'instruction' AND status = 'active' AND deleted_at IS NULL
        AND due_at IS NOT NULL
        AND date(due_at) <= ?
      ORDER BY date(due_at) ASC, created_at DESC
      LIMIT 1`,
    [today],
  );
  if (due) {
    return mapRow(due);
  }

  const recent = await db.getFirstAsync<RevelationRow>(
    `SELECT * FROM instructions
      WHERE kind = 'instruction' AND status = 'active' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  return recent ? mapRow(recent) : null;
}

export async function getRevelationById(id: string): Promise<Revelation | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<RevelationRow>(
    `SELECT * FROM instructions WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function updateRevelation(
  id: string,
  input: UpdateRevelationInput,
): Promise<Revelation | null> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (input.title !== undefined) {
    sets.push("title = ?");
    values.push(input.title);
  }
  if (input.content !== undefined) {
    sets.push("content = ?");
    values.push(input.content);
  }
  if (input.dueAt !== undefined) {
    sets.push("due_at = ?");
    values.push(input.dueAt);
  }
  if (input.occurredAt !== undefined) {
    sets.push("occurred_at = ?");
    values.push(input.occurredAt);
  }

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE instructions SET ${sets.join(", ")}
      WHERE id = ? AND deleted_at IS NULL`,
    values,
  );

  if (input.tags !== undefined) {
    const kind = await getRevelationKind(id);
    if (kind) {
      await setEntryTags(kind, id, input.tags);
    }
  }

  return getRevelationById(id);
}

/** Tag names currently applied to a revelation. */
export async function getRevelationTagNames(id: string): Promise<string[]> {
  const kind = await getRevelationKind(id);
  if (!kind) {
    return [];
  }
  const tags = await listTagsForEntry(kind, id);
  return tags.map((tag) => tag.name);
}

/** Marks a revelation fulfilled (acted on, or come to pass). */
export async function fulfillRevelation(id: string): Promise<Revelation | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE instructions
      SET status = 'fulfilled', updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, id],
  );
  return getRevelationById(id);
}

/** Moves a fulfilled revelation back to active. */
export async function reopenRevelation(id: string): Promise<Revelation | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE instructions
      SET status = 'active', updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, id],
  );
  return getRevelationById(id);
}

export async function softDeleteRevelation(id: string): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE instructions
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, nowIso, id],
  );
}
