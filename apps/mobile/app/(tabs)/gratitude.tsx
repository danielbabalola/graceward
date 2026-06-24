import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GratitudeList } from "@/components/gratitude/GratitudeList";
import { FaithfulnessView } from "@/components/gratitude/FaithfulnessView";
import { spacing } from "@/theme/tokens";

type GratitudeTab = "gratitudes" | "faithfulness";

const tabOptions: { value: GratitudeTab; label: string }[] = [
  { value: "gratitudes", label: "Gratitudes" },
  { value: "faithfulness", label: "Faithfulness" },
];

export default function GratitudeScreen() {
  const [tab, setTab] = useState<GratitudeTab>("gratitudes");

  return (
    <Screen
      title="Gratitude"
      subtitle="Notice mercy and remember God's faithfulness — one day at a time."
    >
      {tab === "gratitudes" ? (
        <View style={styles.addButton}>
          <Button
            label="Add gratitude"
            onPress={() => router.push("/gratitude/new")}
          />
        </View>
      ) : null}
      {tab === "faithfulness" ? (
        <View style={styles.addButton}>
          <Button
            label="Add faithfulness moment"
            onPress={() => router.push("/win/new")}
          />
        </View>
      ) : null}

      <View style={styles.switcher}>
        <SegmentedControl options={tabOptions} value={tab} onChange={setTab} />
      </View>

      {tab === "gratitudes" ? <GratitudeList /> : null}
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
