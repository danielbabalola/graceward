import { Share } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { listAllForExport } from "@/lib/db";
import { EXPORT_DIRECTORY } from "@/lib/export-paths";

export type ExportResult = "shared" | "dismissed";

/**
 * Writes all non-deleted local data to a JSON file in the app's document
 * directory, then opens the system share sheet so the user can save or send it
 * (e.g. "Save to Files"). Runs only when the user taps Export. The gathered
 * content is never logged or uploaded by this app — sharing is fully under the
 * user's control via the OS share sheet.
 */
export async function exportLocalData(): Promise<ExportResult> {
  const data = await listAllForExport();
  const json = JSON.stringify(data, null, 2);

  // Recreate the directory fresh each time so old snapshots (which contain
  // plaintext content) don't accumulate on the device — only the latest export
  // is kept here until the user shares/saves it elsewhere.
  const dir = new Directory(Paths.document, EXPORT_DIRECTORY);
  if (dir.exists) {
    dir.delete();
  }
  dir.create();

  const file = new File(dir, `graceward-export-${Date.now()}.json`);
  file.create();
  file.write(json);

  const result = await Share.share({
    url: file.uri,
    title: "Graceward local data export",
  });

  return result.action === Share.sharedAction ? "shared" : "dismissed";
}
