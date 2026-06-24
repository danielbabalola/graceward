import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { JournalTimeline } from "@/components/journal/JournalTimeline";
import { JournalCalendar } from "@/components/journal/JournalCalendar";
import { spacing } from "@/theme/tokens";

type JournalView = "timeline" | "calendar";

const viewOptions: { value: JournalView; label: string }[] = [
  { value: "timeline", label: "Timeline" },
  { value: "calendar", label: "Calendar" },
];

export default function JournalScreen() {
  const [view, setView] = useState<JournalView>("timeline");

  return (
    <Screen
      title="Journal"
      subtitle="Your reflections over time, kept private and close."
    >
      <View style={styles.switcher}>
        <SegmentedControl
          options={viewOptions}
          value={view}
          onChange={setView}
        />
      </View>

      {view === "timeline" ? <JournalTimeline /> : <JournalCalendar />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  switcher: {
    marginBottom: spacing.lg,
  },
});
