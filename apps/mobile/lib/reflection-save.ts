import { Alert } from "react-native";

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
