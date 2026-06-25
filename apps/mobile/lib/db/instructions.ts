import * as Crypto from "expo-crypto";
import type {
  CreateInstructionInput,
  Instruction,
  InstructionStatus,
  UpdateInstructionInput,
} from "@graceward/shared";
import { getDatabase } from "./client";
import { toLocalDateString } from "./helpers";
import { listTagsForEntry, setEntryTags } from "./tags";

type InstructionRow = {
  id: string;
  title: string;
  content: string;
  due_at: string | null;
  source_journal_entry_id: string | null;
  status: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRow(row: InstructionRow): Instruction {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    dueAt: row.due_at,
    sourceJournalEntryId: row.source_journal_entry_id,
    status: row.status as InstructionStatus,
    syncStatus: row.sync_status as Instruction["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createInstruction(
  input: CreateInstructionInput,
): Promise<Instruction> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  const instruction: Instruction = {
    id: Crypto.randomUUID(),
    title: input.title,
    content: input.content,
    dueAt: input.dueAt ?? null,
    sourceJournalEntryId: input.sourceJournalEntryId ?? null,
    status: input.status ?? "active",
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO instructions (
      id, title, content, due_at, source_journal_entry_id, status, sync_status,
      created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      instruction.id,
      instruction.title,
      instruction.content,
      instruction.dueAt,
      instruction.sourceJournalEntryId,
      instruction.status,
      instruction.syncStatus,
      instruction.createdAt,
      instruction.updatedAt,
      instruction.deletedAt,
    ],
  );

  if (input.tags !== undefined && input.tags.length > 0) {
    await setEntryTags("instruction", instruction.id, input.tags);
  }

  return instruction;
}

/** All non-deleted instructions, newest first. Used for export and broad reads. */
export async function listInstructions(): Promise<Instruction[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<InstructionRow>(
    `SELECT * FROM instructions
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function listRecentInstructions(limit = 10): Promise<Instruction[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<InstructionRow>(
    `SELECT * FROM instructions
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map(mapRow);
}

export async function listInstructionsByStatus(
  status: InstructionStatus,
): Promise<Instruction[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<InstructionRow>(
    `SELECT * FROM instructions
      WHERE status = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [status],
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
 * `date(due_at)` normalizes both date-only (YYYY-MM-DD) and full ISO values to a
 * comparable calendar day.
 */
export async function getInstructionFocus(): Promise<Instruction | null> {
  const db = await getDatabase();
  const today = toLocalDateString(new Date());

  const due = await db.getFirstAsync<InstructionRow>(
    `SELECT * FROM instructions
      WHERE status = 'active' AND deleted_at IS NULL
        AND due_at IS NOT NULL
        AND date(due_at) <= ?
      ORDER BY date(due_at) ASC, created_at DESC
      LIMIT 1`,
    [today],
  );
  if (due) {
    return mapRow(due);
  }

  const recent = await db.getFirstAsync<InstructionRow>(
    `SELECT * FROM instructions
      WHERE status = 'active' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  return recent ? mapRow(recent) : null;
}

export async function getInstructionById(
  id: string,
): Promise<Instruction | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<InstructionRow>(
    `SELECT * FROM instructions WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function updateInstruction(
  id: string,
  input: UpdateInstructionInput,
): Promise<Instruction | null> {
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

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE instructions SET ${sets.join(", ")}
      WHERE id = ? AND deleted_at IS NULL`,
    values,
  );

  if (input.tags !== undefined) {
    await setEntryTags("instruction", id, input.tags);
  }

  return getInstructionById(id);
}

/** Tag names currently applied to an instruction. */
export async function getInstructionTagNames(id: string): Promise<string[]> {
  const tags = await listTagsForEntry("instruction", id);
  return tags.map((tag) => tag.name);
}

/** Marks an instruction as fulfilled (the user has acted on it). */
export async function fulfillInstruction(
  id: string,
): Promise<Instruction | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE instructions
      SET status = 'fulfilled', updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, id],
  );
  return getInstructionById(id);
}

/** Moves a fulfilled instruction back to active. */
export async function reopenInstruction(
  id: string,
): Promise<Instruction | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE instructions
      SET status = 'active', updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, id],
  );
  return getInstructionById(id);
}

export async function softDeleteInstruction(id: string): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE instructions
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, nowIso, id],
  );
}
