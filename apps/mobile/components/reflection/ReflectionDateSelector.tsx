import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CalendarMonth } from "@/components/journal/CalendarMonth";
import { addMonths, type CalendarMonthRef } from "@/lib/calendar";
import { toLocalDateString } from "@/lib/db";
import { formatEntryDate } from "@/lib/journal-display";
import {
  colors,
  radii,
  spacing,
  touchTarget,
  typography,
} from "@/theme/tokens";

type ReflectionDateSelectorProps = {
  /** Selected reflection date as YYYY-MM-DD. */
  value: string;
  /** Called with the newly selected date (never a future date). */
  onChange: (dateString: string) => void;
  /** Optional label shown above the control. Defaults to "Reflection date". */
  label?: string;
};

function monthRefFromDateString(dateString: string): CalendarMonthRef {
  const [year, month] = dateString.split("-").map(Number);
  const now = new Date();
  if (!year || !month) {
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  }
  return { year, monthIndex: month - 1 };
}

/**
 * Calm, collapsible date picker for new reflections. Defaults to today, allows
 * today or any past day, and disables future days via CalendarMonth's maxDate.
 * Shared across every reflection capture screen (type and voice).
 */
export function ReflectionDateSelector({
  value,
  onChange,
  label = "Reflection date",
}: ReflectionDateSelectorProps) {
  const todayDate = useMemo(() => toLocalDateString(new Date()), []);
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState<CalendarMonthRef>(() =>
    monthRefFromDateString(value),
  );

  const isToday = value === todayDate;

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        // Re-anchor the visible month on the current selection each time it
        // opens, so the selected day is always in view.
        setMonth(monthRefFromDateString(value));
      }
      return next;
    });
  }

  function handleSelectDate(dateString: string) {
    onChange(dateString);
    setExpanded(false);
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatEntryDate(value)}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.rowText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>
            {formatEntryDate(value)}
            {isToday ? " · Today" : ""}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.primaryDeep}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.calendarWrapper}>
          <CalendarMonth
            year={month.year}
            monthIndex={month.monthIndex}
            todayDate={todayDate}
            selectedDate={value}
            markedDates={EMPTY_MARKERS}
            maxDate={todayDate}
            onPrevMonth={() =>
              setMonth((m) => addMonths(m.year, m.monthIndex, -1))
            }
            onNextMonth={() =>
              setMonth((m) => addMonths(m.year, m.monthIndex, 1))
            }
            onSelectDate={handleSelectDate}
          />
          <Text style={styles.hint}>You can choose today or a past day.</Text>
        </View>
      ) : null}
    </View>
  );
}

const EMPTY_MARKERS: Set<string> = new Set();

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: touchTarget,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowText: {
    gap: 2,
  },
  label: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  value: {
    ...typography.cardTitle,
    color: colors.text,
  },
  calendarWrapper: {
    gap: spacing.sm,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
  },
  pressed: {
    opacity: 0.85,
  },
});
