import { Directory, Paths } from "expo-file-system";

/**
 * Directory (under the app's document directory) where "Export local data"
 * writes its JSON snapshots. Kept in a dependency-light module so both the
 * exporter and the delete-all flow can reference it without an import cycle.
 */
export const EXPORT_DIRECTORY = "exports";

/**
 * Removes the entire exports directory and every snapshot inside it. Used by
 * "Delete all local data" so a previously exported JSON file (which contains
 * plaintext content) never survives a delete. Best-effort: ignores failures so
 * a missing or already-empty directory does not block clearing the database.
 */
export function deleteAllExports(): void {
  try {
    const dir = new Directory(Paths.document, EXPORT_DIRECTORY);
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // Best-effort; ignore failures.
  }
}
