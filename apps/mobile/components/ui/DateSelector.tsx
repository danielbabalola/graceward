import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { CalendarMonth } from "@/components/journal/CalendarMonth";
import { addMonths, type CalendarMonthRef } from "@/lib/calendar";
import { toLocalDateString } from "@/lib/db";
import {
  colors,
  radii,
  spacing,
  touchTarget,
  typography,
} from "@/theme/tokens";

type DateSelectorProps = {
  /** Label shown above the control (e.g. "Reflection date"). */
  label: string;
  /** Selected date as YYYY-MM-DD, or null when no date is chosen. */
  value: string | null;
  /** Called with the selected date, or null when cleared. */
  onChange: (dateString: string | null) => void;
  /**
   * Optional latest selectable date (YYYY-MM-DD). Future days beyond this are
   * disabled. Omit to allow any future date (e.g. prayer follow-ups).
   */
  maxDate?: string;
  /** When true, days before today are disabled (e.g. future-only follow-ups). */
  disablePast?: boolean;
  /** When true, shows a "Clear date" action (for optional dates). */
  allowClear?: boolean;
  /** Text shown when no date is selected. Defaults to "No date selected". */
  emptyLabel?: string;
  /** Calm helper text shown under the calendar when expanded. */
  hint?: string;
};

const EMPTY_MARKERS: Set<string> = new Set();

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function monthRefFromValue(value: string | null): CalendarMonthRef {
  const now = new Date();
  if (value && DATE_ONLY.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return { year, monthIndex: month - 1 };
  }
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

/** Formats a date-only or ISO value into a calm, readable label. */
function formatValue(value: string): string {
  const isDateOnly = DATE_ONLY.test(value);
  const parsed = new Date(isDateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Calm, collapsible calendar-style date picker built on the local CalendarMonth.
 * Generic enough to back both the reflection date selector (today-or-past via
 * maxDate) and optional, future-allowing dates like prayer follow-ups. No heavy
 * date-picker dependency.
 */
export function DateSelector({
  label,
  value,
  onChange,
  maxDate,
  disablePast = false,
  allowClear = false,
  emptyLabel = "No date selected",
  hint,
}: DateSelectorProps) {
  const todayDate = useMemo(() => toLocalDateString(new Date()), []);
  const minDate = disablePast ? todayDate : undefined;
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState<CalendarMonthRef>(() =>
    monthRefFromValue(value),
  );

  // CalendarMonth highlights a day only when it matches exactly; pass through
  // date-only values, and avoid highlighting unexpected ISO timestamps.
  const selectedDate = value && DATE_ONLY.test(value) ? value : null;
  const isToday = value === todayDate;

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        setMonth(monthRefFromValue(value));
      }
      return next;
    });
  }

  function handleSelectDate(dateString: string) {
    onChange(dateString);
    setExpanded(false);
  }

  function handleClear() {
    onChange(null);
    setExpanded(false);
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatValue(value) : emptyLabel}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.rowText}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>
            {value ? formatValue(value) : emptyLabel}
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
            selectedDate={selectedDate}
            markedDates={EMPTY_MARKERS}
            maxDate={maxDate}
            minDate={minDate}
            onPrevMonth={() =>
              setMonth((m) => addMonths(m.year, m.monthIndex, -1))
            }
            onNextMonth={() =>
              setMonth((m) => addMonths(m.year, m.monthIndex, 1))
            }
            onSelectDate={handleSelectDate}
          />
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          {allowClear && value ? (
            <Button
              label="Clear date"
              variant="secondary"
              onPress={handleClear}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

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
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  value: {
    ...typography.body,
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
