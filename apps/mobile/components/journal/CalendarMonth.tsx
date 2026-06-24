import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getMonthMatrix,
  monthTitle,
  toDateString,
  WEEKDAY_LABELS,
  type CalendarCell,
} from "@/lib/calendar";
import {
  colors,
  radii,
  spacing,
  touchTarget,
  typography,
} from "@/theme/tokens";

type CalendarMonthProps = {
  year: number;
  monthIndex: number;
  todayDate: string;
  selectedDate: string | null;
  markedDates: Set<string>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateString: string) => void;
  /**
   * Optional latest selectable date (YYYY-MM-DD). Days after this are shown
   * disabled and cannot be selected, and the next-month control is disabled
   * once the whole next month is past it. When omitted, all days are
   * selectable (default behaviour used by the Journal calendar).
   */
  maxDate?: string;
  /**
   * Optional earliest selectable date (YYYY-MM-DD). Days before this are shown
   * disabled, and the previous-month control is disabled once the whole
   * previous month is before it.
   */
  minDate?: string;
};

export function CalendarMonth({
  year,
  monthIndex,
  todayDate,
  selectedDate,
  markedDates,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  maxDate,
  minDate,
}: CalendarMonthProps) {
  const weeks = getMonthMatrix(year, monthIndex);
  // Disable forward navigation once the first day of the next month is already
  // beyond maxDate (i.e. the entire next month is in the future).
  const nextMonthDisabled = maxDate
    ? toDateString(year, monthIndex + 1, 1) > maxDate
    : false;
  // Disable backward navigation once the last day of the previous month is
  // already before minDate (i.e. the entire previous month is in the past).
  const prevMonthDisabled = minDate
    ? (() => {
        const lastOfPrev = new Date(year, monthIndex, 0);
        return (
          toDateString(
            lastOfPrev.getFullYear(),
            lastOfPrev.getMonth(),
            lastOfPrev.getDate(),
          ) < minDate
        );
      })()
    : false;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onPrevMonth}
          disabled={prevMonthDisabled}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          accessibilityState={{ disabled: prevMonthDisabled }}
          style={({ pressed }) => [
            styles.navButton,
            pressed && !prevMonthDisabled && styles.pressed,
            prevMonthDisabled && styles.navButtonDisabled,
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primaryDeep} />
        </Pressable>
        <Text style={styles.title}>{monthTitle(year, monthIndex)}</Text>
        <Pressable
          onPress={onNextMonth}
          disabled={nextMonthDisabled}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: nextMonthDisabled }}
          style={({ pressed }) => [
            styles.navButton,
            pressed && !nextMonthDisabled && styles.pressed,
            nextMonthDisabled && styles.navButtonDisabled,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.primaryDeep}
          />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.weekdayCell}>
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((cell, cellIndex) => (
            <DayCell
              key={cell ? cell.dateString : `empty-${weekIndex}-${cellIndex}`}
              cell={cell}
              isToday={cell?.dateString === todayDate}
              isSelected={cell?.dateString === selectedDate}
              hasEntries={cell ? markedDates.has(cell.dateString) : false}
              isDisabled={
                cell
                  ? (maxDate ? cell.dateString > maxDate : false) ||
                    (minDate ? cell.dateString < minDate : false)
                  : false
              }
              onSelectDate={onSelectDate}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

type DayCellProps = {
  cell: CalendarCell;
  isToday: boolean;
  isSelected: boolean;
  hasEntries: boolean;
  isDisabled: boolean;
  onSelectDate: (dateString: string) => void;
};

function DayCell({
  cell,
  isToday,
  isSelected,
  hasEntries,
  isDisabled,
  onSelectDate,
}: DayCellProps) {
  if (!cell) {
    return <View style={styles.dayCell} />;
  }

  return (
    <View style={styles.dayCell}>
      <Pressable
        onPress={() => onSelectDate(cell.dateString)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={cell.dateString}
        accessibilityState={{ selected: isSelected, disabled: isDisabled }}
        style={({ pressed }) => [
          styles.dayButton,
          isSelected && styles.daySelected,
          pressed && !isSelected && !isDisabled && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            isToday && styles.dayToday,
            isSelected && styles.dayNumberSelected,
            isDisabled && styles.dayDisabled,
          ]}
        >
          {cell.day}
        </Text>
        <View
          style={[
            styles.dot,
            hasEntries && !isDisabled ? styles.dotVisible : undefined,
          ]}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    width: touchTarget,
    height: touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    opacity: 0.25,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekdayLabel: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
  },
  dayButton: {
    width: 40,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  daySelected: {
    backgroundColor: colors.primaryLight,
  },
  dayNumber: {
    ...typography.bodySmall,
    color: colors.text,
  },
  dayToday: {
    color: colors.accentGold,
    fontWeight: "700",
  },
  dayNumberSelected: {
    color: colors.primaryDeep,
    fontWeight: "600",
  },
  dayDisabled: {
    color: colors.textSubtle,
    opacity: 0.4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  dotVisible: {
    backgroundColor: colors.sage,
  },
  pressed: {
    opacity: 0.7,
  },
});
