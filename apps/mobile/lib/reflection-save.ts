import { Alert } from "react-native";
import { router } from "expo-router";
import type { JournalEntry } from "@graceward/shared";
import { isAutoAiReflectionEnabled } from "@/lib/db";
import { canAnalyzeEntry } from "@/lib/api/reflection";

/**
 * Routes the user onward after a reflection is saved. When automatic AI
 * reflection is enabled in Settings and the saved entry is eligible, this goes
 * straight to the AI reflection screen and lets it auto-run the analysis (the
 * user already consented when enabling the setting). Otherwise it lands on the
 * journal, exactly as before. Any preference read failure falls back to the
 * journal so a saved reflection is never left stranded.
 */
export async function navigateAfterReflectionSave(
  entry: JournalEntry,
): Promise<void> {
  try {
    if (canAnalyzeEntry(entry) && (await isAutoAiReflectionEnabled())) {
      router.replace({
        pathname: "/ai-reflection/[id]",
        params: { id: entry.id, auto: "1" },
      });
      return;
    }
  } catch (error: unknown) {
    console.warn(
      "Failed to resolve auto AI reflection preference:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
  router.replace("/(tabs)/journal");
}

/**
 * Shared, calm error handling for reflection saves. Never logs raw reflection
 * content — only an error category — and surfaces a gentle message. Future
 * dates are blocked at the data layer (defensive: the UI already prevents
 * selecting them) and get a clearer, reassuring message.
 */
export function handleReflectionSaveError(error: unknown): void {
  const message = error instanceof Error ? error.message : "unknown error";
  console.warn("Failed to save reflection:", message);

  if (message === "FUTURE_ENTRY_DATE") {
    Alert.alert(
      "Choose today or earlier",
      "A reflection can be saved for today or a past day, but not a future date.",
    );
    return;
  }

  Alert.alert(
    "Could not save",
    "Your reflection could not be saved just now. Please try again.",
  );
}
