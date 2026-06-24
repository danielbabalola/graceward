import * as Crypto from "expo-crypto";
import type {
  CreateLessonInput,
  Lesson,
  LessonStatus,
  UpdateLessonInput,
} from "@graceward/shared";
import { getDatabase } from "./client";

type LessonRow = {
  id: string;
  title: string;
  content: string;
  theme: string | null;
  source_journal_entry_id: string | null;
  status: string;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRow(row: LessonRow): Lesson {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    theme: row.theme,
    sourceJournalEntryId: row.source_journal_entry_id,
    status: row.status as LessonStatus,
    syncStatus: row.sync_status as Lesson["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createLesson(input: CreateLessonInput): Promise<Lesson> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  const lesson: Lesson = {
    id: Crypto.randomUUID(),
    title: input.title,
    content: input.content,
    theme: input.theme ?? null,
    sourceJournalEntryId: input.sourceJournalEntryId ?? null,
    status: input.status ?? "active",
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO lessons (
      id, title, content, theme, source_journal_entry_id, status, sync_status,
      created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lesson.id,
      lesson.title,
      lesson.content,
      lesson.theme,
      lesson.sourceJournalEntryId,
      lesson.status,
      lesson.syncStatus,
      lesson.createdAt,
      lesson.updatedAt,
      lesson.deletedAt,
    ],
  );

  return lesson;
}

/** All non-deleted lessons, newest first. Used for export and broad reads. */
export async function listLessons(): Promise<Lesson[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<LessonRow>(
    `SELECT * FROM lessons
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function listRecentLessons(limit = 10): Promise<Lesson[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<LessonRow>(
    `SELECT * FROM lessons
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ?`,
    [limit],
  );
  return rows.map(mapRow);
}

export async function listLessonsByStatus(
  status: LessonStatus,
): Promise<Lesson[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<LessonRow>(
    `SELECT * FROM lessons
      WHERE status = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [status],
  );
  return rows.map(mapRow);
}

/** Most recent active lesson, for the Today "What I'm Learning" card. */
export async function getMostRecentLesson(): Promise<Lesson | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<LessonRow>(
    `SELECT * FROM lessons
      WHERE status = 'active' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  return row ? mapRow(row) : null;
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<LessonRow>(
    `SELECT * FROM lessons WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function updateLesson(
  id: string,
  input: UpdateLessonInput,
): Promise<Lesson | null> {
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
  if (input.theme !== undefined) {
    sets.push("theme = ?");
    values.push(input.theme);
  }

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE lessons SET ${sets.join(", ")}
      WHERE id = ? AND deleted_at IS NULL`,
    values,
  );

  return getLessonById(id);
}

export async function archiveLesson(id: string): Promise<Lesson | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE lessons
      SET status = 'archived', updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, id],
  );
  return getLessonById(id);
}

/** Moves an archived lesson back to active. */
export async function reactivateLesson(id: string): Promise<Lesson | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE lessons
      SET status = 'active', updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, id],
  );
  return getLessonById(id);
}

export async function softDeleteLesson(id: string): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE lessons
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, nowIso, id],
  );
}
