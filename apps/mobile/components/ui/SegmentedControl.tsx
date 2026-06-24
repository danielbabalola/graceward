import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, touchTarget, typography } from "@/theme/tokens";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              style={[styles.label, selected && styles.labelSelected]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
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
    flex: 1,
    minHeight: touchTarget,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
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
