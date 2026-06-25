import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Thin, fire-and-forget wrapper around expo-haptics. Haptics are a "nice to
 * have" texture, never load-bearing, so every call is best-effort: failures and
 * the web platform (where the API is unavailable) are silently ignored.
 */
function run(fn: () => Promise<void>): void {
  if (Platform.OS === "web") {
    return;
  }
  void fn().catch(() => {
    // Haptics are non-essential; ignore unsupported devices/permissions.
  });
}

export const haptics = {
  /** Light tap — primary/secondary button presses. */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Medium tap — weightier moments like starting/stopping a recording. */
  medium: () =>
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Selection tick — navigating between cards, tabs, or segments. */
  selection: () => run(() => Haptics.selectionAsync()),
  /** Success notification — a reflection or entry was saved. */
  success: () =>
    run(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ),
} as const;
