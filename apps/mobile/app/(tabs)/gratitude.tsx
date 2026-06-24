import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GratitudeList } from "@/components/gratitude/GratitudeList";
import { FaithfulnessView } from "@/components/gratitude/FaithfulnessView";
import { LessonsList } from "@/components/lessons/LessonsList";
import {
  DEFAULT_REMEMBER_SEGMENT,
  parseRememberSegment,
  type RememberSegment,
} from "@/lib/remember-segments";
import { spacing } from "@/theme/tokens";

const tabOptions: { value: RememberSegment; label: string }[] = [
  { value: "gratitudes", label: "Gratitude" },
  { value: "faithfulness", label: "Faithfulness" },
  { value: "lessons", label: "Lessons" },
];

export default function RememberScreen() {
  const params = useLocalSearchParams<{ segment?: string }>();
  const [tab, setTab] = useState<RememberSegment>(DEFAULT_REMEMBER_SEGMENT);

  // Keep the latest param readable inside the focus effect without making the
  // effect depend on it (which would re-run and clobber a manual selection).
  const segmentRef = useRef(params.segment);
  segmentRef.current = params.segment;

  // On each focus: honor a `segment` param if present, then clear it so a later
  // normal return defaults calmly to Gratitude. With no param, reset to the
  // default. Manual segment switches while focused are preserved (this only
  // runs on focus, not on every render).
  useFocusEffect(
    useCallback(() => {
      const raw = segmentRef.current;
      setTab(parseRememberSegment(raw));
      if (raw !== undefined) {
        router.setParams({ segment: undefined });
      }
    }, []),
  );

  return (
    <Screen
      title="Remember"
      subtitle="Notice mercy, remember God's faithfulness, and hold what you're learning — one day at a time."
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
      {tab === "lessons" ? (
        <View style={styles.addButton}>
          <Button label="Save a lesson" onPress={() => router.push("/lesson/new")} />
        </View>
      ) : null}

      <View style={styles.switcher}>
        <SegmentedControl options={tabOptions} value={tab} onChange={setTab} />
      </View>

      {tab === "gratitudes" ? <GratitudeList /> : null}
      {tab === "faithfulness" ? <FaithfulnessView /> : null}
      {tab === "lessons" ? <LessonsList /> : null}
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
