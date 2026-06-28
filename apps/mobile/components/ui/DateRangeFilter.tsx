import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DateSelector } from "@/components/ui/DateSelector";
import { toLocalDateString } from "@/lib/db";
import {
  type DateRange,
  type DateRangePreset,
  EMPTY_RANGE,
  presetDateRange,
} from "@/lib/entry-filter";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type DateRangeFilterProps = {
  /** Notified with the resolved range whenever the selection changes. */
  onChange: (range: DateRange) => void;
};

const PRESETS: { preset: DateRangePreset; label: string }[] = [
  { preset: "all", label: "All time" },
  { preset: "month", label: "This month" },
  { preset: "year", label: "This year" },
  { preset: "custom", label: "Custom" },
];

/**
 * A row of quick date-range chips ("All time", "This month", "This year") plus
 * a "Custom" option that reveals From/To calendar pickers. Owns its own
 * selection state and reports the resolved range up via `onChange`.
 */
export function DateRangeFilter({ onChange }: DateRangeFilterProps) {
  const today = useMemo(() => toLocalDateString(new Date()), []);
  const [preset, setPreset] = useState<DateRangePreset>("all");
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);

  function selectPreset(next: DateRangePreset) {
    setPreset(next);
    onChange(
      next === "custom"
        ? { startDate: customStart, endDate: customEnd }
        : presetDateRange(next),
    );
  }

  function updateCustomStart(value: string | null) {
    setCustomStart(value);
    onChange({ startDate: value, endDate: customEnd });
  }

  function updateCustomEnd(value: string | null) {
    setCustomEnd(value);
    onChange({ startDate: customStart, endDate: value });
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {PRESETS.map((option) => (
          <RangeChip
            key={option.preset}
            label={option.label}
            active={preset === option.preset}
            onPress={() => selectPreset(option.preset)}
          />
        ))}
      </ScrollView>

      {preset === "custom" ? (
        <View style={styles.custom}>
          <DateSelector
            label="From"
            value={customStart}
            onChange={updateCustomStart}
            maxDate={customEnd ?? today}
            allowClear
            emptyLabel="Earliest"
          />
          <DateSelector
            label="To"
            value={customEnd}
            onChange={updateCustomEnd}
            maxDate={today}
            allowClear
            emptyLabel="Latest"
          />
        </View>
      ) : null}
    </View>
  );
}

/** The "no date filter" range, re-exported so callers can seed their state. */
export { EMPTY_RANGE };

function RangeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Date range: ${label}`}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  custom: {
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep,
  },
  pressed: {
    opacity: 0.8,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.white,
  },
});
