import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useNavigation } from "expo-router";

type UnsavedChangesGuardOptions = {
  title?: string;
  message?: string;
  /** Label for the action that leaves and discards the draft. */
  confirmLabel?: string;
  /** Label for the action that stays on the screen. */
  cancelLabel?: string;
};

const DEFAULT_TITLE = "Discard changes?";
const DEFAULT_MESSAGE =
  "You have unsaved changes. If you leave now, they'll be lost.";
const DEFAULT_CONFIRM = "Discard";
const DEFAULT_CANCEL = "Keep editing";

/**
 * Warns before leaving a screen that has unsaved input. Hooks into the
 * navigation `beforeRemove` event so it covers the custom in-app Back button
 * (which calls `router.back()`), the Android hardware back button, and the iOS
 * swipe-back gesture alike.
 *
 * The returned `allowNextNavigation` MUST be called right before any
 * programmatic navigation that should NOT prompt — most importantly, navigating
 * away after a successful save.
 */
export function useUnsavedChangesGuard(
  hasUnsavedChanges: boolean,
  options?: UnsavedChangesGuardOptions,
): { allowNextNavigation: () => void } {
  const navigation = useNavigation();

  // Mirror the latest dirty state / options into refs so the long-lived
  // listener always reads current values without needing to re-subscribe.
  const blocked = useRef(hasUnsavedChanges);
  blocked.current = hasUnsavedChanges;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const allowNextNavigation = useCallback(() => {
    blocked.current = false;
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (!blocked.current) {
        return;
      }
      event.preventDefault();
      const opts = optionsRef.current;
      Alert.alert(
        opts?.title ?? DEFAULT_TITLE,
        opts?.message ?? DEFAULT_MESSAGE,
        [
          { text: opts?.cancelLabel ?? DEFAULT_CANCEL, style: "cancel" },
          {
            text: opts?.confirmLabel ?? DEFAULT_CONFIRM,
            style: "destructive",
            onPress: () => {
              // Stop intercepting before replaying the original action so the
              // dispatch isn't caught again, which would loop the prompt.
              blocked.current = false;
              navigation.dispatch(event.data.action);
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation]);

  return { allowNextNavigation };
}
