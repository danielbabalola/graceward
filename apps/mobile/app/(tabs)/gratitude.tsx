import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GratitudeList } from "@/components/gratitude/GratitudeList";
import { WinList } from "@/components/gratitude/WinList";
import { FaithfulnessView } from "@/components/gratitude/FaithfulnessView";
import { spacing } from "@/theme/tokens";

type GratitudeTab = "gratitudes" | "wins" | "faithfulness";

const tabOptions: { value: GratitudeTab; label: string }[] = [
  { value: "gratitudes", label: "Gratitudes" },
  { value: "wins", label: "Wins" },
  { value: "faithfulness", label: "Faithfulness" },
];

export default function GratitudeScreen() {
  const [tab, setTab] = useState<GratitudeTab>("gratitudes");

  return (
    <Screen
      title="Gratitude"
      subtitle="Notice mercy, wins, and God's care — one day at a time."
    >
      {tab === "gratitudes" ? (
        <View style={styles.addButton}>
          <Button
            label="Add gratitude"
            onPress={() => router.push("/gratitude/new")}
          />
        </View>
      ) : null}
      {tab === "wins" ? (
        <View style={styles.addButton}>
          <Button label="Add win" onPress={() => router.push("/win/new")} />
        </View>
      ) : null}

      <View style={styles.switcher}>
        <SegmentedControl options={tabOptions} value={tab} onChange={setTab} />
      </View>

      {tab === "gratitudes" ? <GratitudeList /> : null}
      {tab === "wins" ? <WinList /> : null}
      {tab === "faithfulness" ? <FaithfulnessView /> : null}
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
