import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { JournalEntry } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { CalendarMonth } from "@/components/journal/CalendarMonth";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import {
  isFutureLocalDate,
  listJournalEntriesByDate,
  listJournalEntryDatesForMonth,
} from "@/lib/db";
import { addMonths } from "@/lib/calendar";
import { toLocalDateString } from "@/lib/db/helpers";
import { formatEntryDate } from "@/lib/journal-display";
import { colors, spacing, typography } from "@/theme/tokens";

type DayLoadState = "loading" | "ready" | "error";

export function JournalCalendar() {
  const todayDate = useMemo(() => toLocalDateString(new Date()), []);
  const initial = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  }, []);

  const [month, setMonth] = useState(initial);
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [dayEntries, setDayEntries] = useState<JournalEntry[]>([]);
  const [dayState, setDayState] = useState<DayLoadState>("loading");

  useFocusEffect(
    useCallback(() => {
      let active = true;

      listJournalEntryDatesForMonth(month.year, month.monthIndex)
        .then((dates) => {
          if (active) {
            setMarkedDates(new Set(dates));
          }
        })
        .catch((error: unknown) => {
          console.warn(
            "Failed to load calendar markers:",
            error instanceof Error ? error.message : "unknown error",
          );
        });

      setDayState((prev) => (prev === "ready" ? prev : "loading"));
      listJournalEntriesByDate(selectedDate)
        .then((rows) => {
          if (active) {
            setDayEntries(rows);
            setDayState("ready");
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setDayState("error");
          }
          console.warn(
            "Failed to load entries for day:",
            error instanceof Error ? error.message : "unknown error",
          );
        });

      return () => {
        active = false;
      };
    }, [month, selectedDate]),
  );

  return (
    <View style={styles.container}>
      <CalendarMonth
        year={month.year}
        monthIndex={month.monthIndex}
        todayDate={todayDate}
        selectedDate={selectedDate}
        markedDates={markedDates}
        maxDate={todayDate}
        onPrevMonth={() =>
          setMonth((m) => addMonths(m.year, m.monthIndex, -1))
        }
        onNextMonth={() => setMonth((m) => addMonths(m.year, m.monthIndex, 1))}
        onSelectDate={setSelectedDate}
      />

      <View style={styles.daySection}>
        <Text style={styles.dayHeader}>{formatEntryDate(selectedDate)}</Text>

        {isFutureLocalDate(selectedDate, todayDate) ? null : (
          <Button
            label="Add reflection for this day"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/reflection",
                params: { entryDate: selectedDate },
              })
            }
          />
        )}

        {dayState === "loading" ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primaryDeep} />
          </View>
        ) : dayState === "error" ? (
          <Text style={styles.emptyText}>
            These reflections could not be loaded. Please try again.
          </Text>
        ) : dayEntries.length === 0 ? (
          <Text style={styles.emptyText}>Nothing saved for this day.</Text>
        ) : (
          <View style={styles.list}>
            {dayEntries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onPress={() =>
                  router.push({
                    pathname: "/journal/[id]",
                    params: { id: entry.id },
                  })
                }
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  daySection: {
    gap: spacing.sm,
  },
  dayHeader: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  centered: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
  list: {
    gap: spacing.sm,
  },
});
