import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { PrayerRequestStatus } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { PrayerList } from "@/components/prayer/PrayerList";
import { spacing } from "@/theme/tokens";

const statusOptions: { value: PrayerRequestStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "answered", label: "Answered" },
  { value: "archived", label: "Archived" },
];

export default function PrayerScreen() {
  const [status, setStatus] = useState<PrayerRequestStatus>("active");

  return (
    <Screen
      title="Prayer"
      subtitle="Bring what matters before God — and remember when He answers."
    >
      <View style={styles.addButton}>
        <Button
          label="Add prayer request"
          onPress={() => router.push("/prayer/new")}
        />
      </View>

      <View style={styles.switcher}>
        <SegmentedControl
          options={statusOptions}
          value={status}
          onChange={setStatus}
        />
      </View>

      <PrayerList status={status} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    marginBottom: spacing.lg,
  },
  switcher: {
    marginBottom: spacing.lg,
  },
});
