import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, touchTarget, typography } from "@/theme/tokens";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * When true, segments size to their label and the control scrolls
   * horizontally instead of dividing the width into equal slots. Use when there
   * are several (or long) labels that would otherwise be cramped.
   */
  scrollable?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  scrollable = false,
}: SegmentedControlProps<T>) {
  const segments = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        onPress={() => onChange(option.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[
          styles.segment,
          scrollable ? styles.segmentAuto : styles.segmentFlex,
          selected && styles.segmentSelected,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.label, selected && styles.labelSelected]}
        >
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        {segments}
      </ScrollView>
    );
  }

  return <View style={styles.track}>{segments}</View>;
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: "#F0E9DC",
    borderRadius: radii.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    minHeight: touchTarget,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentFlex: {
    flex: 1,
  },
  segmentAuto: {
    paddingHorizontal: spacing.md,
  },
  segmentSelected: {
    backgroundColor: colors.cardBackground,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.primaryDeep,
    fontWeight: "600",
  },
});
