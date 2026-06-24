import * as Crypto from "expo-crypto";
import type { AnalyzeReflectionResponse } from "@graceward/ai-schemas";
import { getDatabase } from "./client";

export type AiReflectionResult = {
  id: string;
  journalEntryId: string;
  result: AnalyzeReflectionResponse;
  provider: string | null;
  model: string | null;
  createdAt: string;
};

type AiReflectionResultRow = {
  id: string;
  journal_entry_id: string;
  result_json: string;
  provider: string | null;
  model: string | null;
  created_at: string;
  deleted_at: string | null;
};

function mapRow(row: AiReflectionResultRow): AiReflectionResult | null {
  try {
    const result = JSON.parse(row.result_json) as AnalyzeReflectionResponse;
    return {
      id: row.id,
      journalEntryId: row.journal_entry_id,
      result,
      provider: row.provider,
      model: row.model,
      createdAt: row.created_at,
    };
  } catch {
    // A corrupt cached row should not crash the screen; treat as missing.
    return null;
  }
}

export type CreateAiReflectionResultInput = {
  journalEntryId: string;
  result: AnalyzeReflectionResponse;
  provider?: string | null;
  model?: string | null;
};

export async function createAiReflectionResult(
  input: CreateAiReflectionResultInput,
): Promise<AiReflectionResult> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  const id = Crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO ai_reflection_results (
      id, journal_entry_id, result_json, provider, model, created_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.journalEntryId,
      JSON.stringify(input.result),
      input.provider ?? null,
      input.model ?? null,
      nowIso,
      null,
    ],
  );

  return {
    id,
    journalEntryId: input.journalEntryId,
    result: input.result,
    provider: input.provider ?? null,
    model: input.model ?? null,
    createdAt: nowIso,
  };
}

/** Most recent non-deleted AI result for an entry, or null if none/corrupt. */
export async function getLatestAiReflectionResult(
  journalEntryId: string,
): Promise<AiReflectionResult | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AiReflectionResultRow>(
    `SELECT * FROM ai_reflection_results
      WHERE journal_entry_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [journalEntryId],
  );
  return row ? mapRow(row) : null;
}
