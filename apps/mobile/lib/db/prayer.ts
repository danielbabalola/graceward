import * as Crypto from "expo-crypto";
import type {
  CreatePrayerRequestInput,
  PrayerRequest,
  PrayerRequestStatus,
  UpdatePrayerRequestInput,
} from "@graceward/shared";
import { getDatabase } from "./client";
import { toLocalDateString } from "./helpers";

type PrayerRequestRow = {
  id: string;
  title: string;
  description: string | null;
  source_journal_entry_id: string | null;
  status: string;
  follow_up_at: string | null;
  answered_at: string | null;
  answer_description: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRow(row: PrayerRequestRow): PrayerRequest {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceJournalEntryId: row.source_journal_entry_id,
    status: row.status as PrayerRequestStatus,
    followUpAt: row.follow_up_at,
    answeredAt: row.answered_at,
    answerDescription: row.answer_description,
    syncStatus: row.sync_status as PrayerRequest["syncStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createPrayerRequest(
  input: CreatePrayerRequestInput,
): Promise<PrayerRequest> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  const request: PrayerRequest = {
    id: Crypto.randomUUID(),
    title: input.title,
    description: input.description ?? null,
    sourceJournalEntryId: input.sourceJournalEntryId ?? null,
    status: input.status ?? "active",
    followUpAt: input.followUpAt ?? null,
    answeredAt: null,
    answerDescription: null,
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO prayer_requests (
      id, title, description, source_journal_entry_id, status, follow_up_at,
      answered_at, answer_description, sync_status, created_at, updated_at,
      deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      request.id,
      request.title,
      request.description,
      request.sourceJournalEntryId,
      request.status,
      request.followUpAt,
      request.answeredAt,
      request.answerDescription,
      request.syncStatus,
      request.createdAt,
      request.updatedAt,
      request.deletedAt,
    ],
  );

  return request;
}

export async function listPrayerRequests(): Promise<PrayerRequest[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PrayerRequestRow>(
    `SELECT * FROM prayer_requests
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function listPrayerRequestsByStatus(
  status: PrayerRequestStatus,
): Promise<PrayerRequest[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PrayerRequestRow>(
    `SELECT * FROM prayer_requests
      WHERE status = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [status],
  );
  return rows.map(mapRow);
}

/**
 * Selects the single prayer request to surface on the Today screen.
 *
 * Preference order:
 * 1. An active request whose follow-up date is today or earlier (most overdue
 *    first), so the user is gently reminded of what they meant to revisit.
 * 2. Otherwise the most recently created active request.
 *
 * `date(follow_up_at)` normalizes both date-only (YYYY-MM-DD) and full ISO
 * values to a comparable calendar day.
 */
export async function getPrayerFocus(): Promise<PrayerRequest | null> {
  const db = await getDatabase();
  const today = toLocalDateString(new Date());

  const due = await db.getFirstAsync<PrayerRequestRow>(
    `SELECT * FROM prayer_requests
      WHERE status = 'active' AND deleted_at IS NULL
        AND follow_up_at IS NOT NULL
        AND date(follow_up_at) <= ?
      ORDER BY date(follow_up_at) ASC, created_at DESC
      LIMIT 1`,
    [today],
  );
  if (due) {
    return mapRow(due);
  }

  const recent = await db.getFirstAsync<PrayerRequestRow>(
    `SELECT * FROM prayer_requests
      WHERE status = 'active' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
  );
  return recent ? mapRow(recent) : null;
}

export async function listPrayerRequestsBySourceJournalEntryId(
  journalEntryId: string,
): Promise<PrayerRequest[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PrayerRequestRow>(
    `SELECT * FROM prayer_requests
      WHERE source_journal_entry_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [journalEntryId],
  );
  return rows.map(mapRow);
}

export async function getMostRecentAnsweredPrayer(): Promise<PrayerRequest | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PrayerRequestRow>(
    `SELECT * FROM prayer_requests
      WHERE status = 'answered' AND deleted_at IS NULL
      ORDER BY answered_at DESC, created_at DESC
      LIMIT 1`,
  );
  return row ? mapRow(row) : null;
}

export async function getPrayerRequestById(
  id: string,
): Promise<PrayerRequest | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PrayerRequestRow>(
    `SELECT * FROM prayer_requests WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapRow(row) : null;
}

export async function updatePrayerRequest(
  id: string,
  input: UpdatePrayerRequestInput,
): Promise<PrayerRequest | null> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (input.title !== undefined) {
    sets.push("title = ?");
    values.push(input.title);
  }
  if (input.description !== undefined) {
    sets.push("description = ?");
    values.push(input.description);
  }
  if (input.followUpAt !== undefined) {
    sets.push("follow_up_at = ?");
    values.push(input.followUpAt);
  }

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE prayer_requests SET ${sets.join(", ")}
      WHERE id = ? AND deleted_at IS NULL`,
    values,
  );

  return getPrayerRequestById(id);
}

export async function markPrayerRequestAnswered(
  id: string,
  answerDescription?: string | null,
): Promise<PrayerRequest | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  await db.runAsync(
    `UPDATE prayer_requests
      SET status = 'answered', answered_at = ?, answer_description = ?,
          updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, answerDescription ?? null, nowIso, id],
  );

  return getPrayerRequestById(id);
}

export async function archivePrayerRequest(
  id: string,
): Promise<PrayerRequest | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  await db.runAsync(
    `UPDATE prayer_requests
      SET status = 'archived', updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, id],
  );

  return getPrayerRequestById(id);
}

/**
 * Moves an archived or answered request back to Active.
 *
 * MVP decision: the schema has a single `status` column, so it cannot reliably
 * distinguish "archived from active" vs "archived after being answered". We
 * therefore choose the simpler, consistent behavior — an active request carries
 * no answered metadata, matching how requests are first created — by clearing
 * `answered_at` and `answer_description` on reactivation.
 */
export async function reactivatePrayerRequest(
  id: string,
): Promise<PrayerRequest | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  await db.runAsync(
    `UPDATE prayer_requests
      SET status = 'active', answered_at = NULL, answer_description = NULL,
          updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, id],
  );

  return getPrayerRequestById(id);
}

export async function softDeletePrayerRequest(id: string): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();

  await db.runAsync(
    `UPDATE prayer_requests
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL`,
    [nowIso, nowIso, id],
  );
}
