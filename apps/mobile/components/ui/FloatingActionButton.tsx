import { StyleSheet, Text } from "react-native";
import { PressableScale } from "@/components/ui/PressableScale";
import { colors, shadows, typography } from "@/theme/tokens";

type FloatingActionButtonProps = {
  onPress: () => void;
  /** Required: describes the action for screen readers (e.g. "Add prayer request"). */
  accessibilityLabel: string;
  /** Glyph shown in the button. Defaults to a plus. */
  icon?: string;
};

const FAB_SIZE = 56;

/**
 * A circular primary action button that floats above a scrolling list. Kept as
 * its own component so list screens can hand the same affordance a different
 * action/label (and, on tabbed screens, swap the action per tab) without
 * each reimplementing the floating layout.
 */
export function FloatingActionButton({
  onPress,
  accessibilityLabel,
  icon = "+",
}: FloatingActionButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.button}
    >
      <Text style={styles.icon} allowFontScaling={false}>
        {icon}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.high,
  },
  icon: {
    ...typography.screenTitle,
    color: colors.white,
    // Optically center the plus glyph within the circle.
    lineHeight: 34,
    marginTop: -2,
  },
});
