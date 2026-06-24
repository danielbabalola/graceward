import * as Crypto from "expo-crypto";
import type { AudioAsset, CreateAudioAssetInput } from "@graceward/shared";
import { getDatabase } from "./client";

type AudioAssetRow = {
  id: string;
  journal_entry_id: string;
  local_file_path: string;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  transcription_status: string;
  retention_policy: string;
  sync_status: string;
  created_at: string;
  deleted_at: string | null;
};

function mapRow(row: AudioAssetRow): AudioAsset {
  return {
    id: row.id,
    journalEntryId: row.journal_entry_id,
    localFilePath: row.local_file_path,
    durationSeconds: row.duration_seconds,
    fileSizeBytes: row.file_size_bytes,
    mimeType: row.mime_type,
    transcriptionStatus:
      row.transcription_status as AudioAsset["transcriptionStatus"],
    retentionPolicy: row.retention_policy as AudioAsset["retentionPolicy"],
    syncStatus: row.sync_status as AudioAsset["syncStatus"],
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

export async function createAudioAsset(
  input: CreateAudioAssetInput,
): Promise<AudioAsset> {
  const db = await getDatabase();
  const asset: AudioAsset = {
    id: Crypto.randomUUID(),
    journalEntryId: input.journalEntryId,
    localFilePath: input.localFilePath,
    durationSeconds: input.durationSeconds ?? null,
    fileSizeBytes: input.fileSizeBytes ?? null,
    mimeType: input.mimeType ?? null,
    transcriptionStatus: input.transcriptionStatus ?? "none",
    retentionPolicy: input.retentionPolicy ?? "keep_device_only",
    syncStatus: input.syncStatus ?? "local_only",
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };

  await db.runAsync(
    `INSERT INTO audio_assets (
      id, journal_entry_id, local_file_path, duration_seconds, file_size_bytes,
      mime_type, transcription_status, retention_policy, sync_status,
      created_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      asset.id,
      asset.journalEntryId,
      asset.localFilePath,
      asset.durationSeconds,
      asset.fileSizeBytes,
      asset.mimeType,
      asset.transcriptionStatus,
      asset.retentionPolicy,
      asset.syncStatus,
      asset.createdAt,
      asset.deletedAt,
    ],
  );

  return asset;
}

export async function getAudioAssetByEntryId(
  journalEntryId: string,
): Promise<AudioAsset | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AudioAssetRow>(
    `SELECT * FROM audio_assets
      WHERE journal_entry_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [journalEntryId],
  );
  return row ? mapRow(row) : null;
}

/** Non-deleted audio asset metadata for data export (no raw audio bytes). */
export async function listAudioAssetsForExport(): Promise<AudioAsset[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AudioAssetRow>(
    `SELECT * FROM audio_assets
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map(mapRow);
}

export async function softDeleteAudioAssetsForEntry(
  journalEntryId: string,
): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `UPDATE audio_assets
      SET deleted_at = ?
      WHERE journal_entry_id = ? AND deleted_at IS NULL`,
    [nowIso, journalEntryId],
  );
}
