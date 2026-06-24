import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getMonthMatrix,
  monthTitle,
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
}: CalendarMonthProps) {
  const weeks = getMonthMatrix(year, monthIndex);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={onPrevMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primaryDeep} />
        </Pressable>
        <Text style={styles.title}>{monthTitle(year, monthIndex)}</Text>
        <Pressable
          onPress={onNextMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
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
  onSelectDate: (dateString: string) => void;
};

function DayCell({
  cell,
  isToday,
  isSelected,
  hasEntries,
  onSelectDate,
}: DayCellProps) {
  if (!cell) {
    return <View style={styles.dayCell} />;
  }

  return (
    <View style={styles.dayCell}>
      <Pressable
        onPress={() => onSelectDate(cell.dateString)}
        accessibilityRole="button"
        accessibilityLabel={cell.dateString}
        accessibilityState={{ selected: isSelected }}
        style={({ pressed }) => [
          styles.dayButton,
          isSelected && styles.daySelected,
          pressed && !isSelected && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            isToday && styles.dayToday,
            isSelected && styles.dayNumberSelected,
          ]}
        >
          {cell.day}
        </Text>
        <View
          style={[styles.dot, hasEntries ? styles.dotVisible : undefined]}
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
