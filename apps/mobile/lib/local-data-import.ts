import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { importLocalData, type ImportSummary } from "@/lib/db";
import { parseLocalDataExport } from "@/lib/import-parse";

/**
 * Result of an import attempt started from Settings. "cancelled" means the user
 * dismissed the file picker; "invalid" carries a user-facing reason the chosen
 * file couldn't be imported; "imported" carries what was added vs. skipped.
 */
export type ImportResult =
  | { status: "imported"; summary: ImportSummary }
  | { status: "cancelled" }
  | { status: "invalid"; message: string };

/**
 * Opens the system file picker, reads the chosen Graceward export JSON, and
 * merges it into the local database (insert-or-ignore, so existing entries are
 * never duplicated). Reads the file only when the user picks one; nothing is
 * uploaded or logged.
 */
export async function importLocalDataFromFile(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets || picked.assets.length === 0) {
    return { status: "cancelled" };
  }

  const raw = await new File(picked.assets[0].uri).text();

  const parsed = parseLocalDataExport(raw);
  if (!parsed.ok) {
    return { status: "invalid", message: parsed.error };
  }

  const summary = await importLocalData(parsed.data);
  return { status: "imported", summary };
}
