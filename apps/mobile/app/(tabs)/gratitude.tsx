import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GratitudeList } from "@/components/gratitude/GratitudeList";
import { FaithfulnessView } from "@/components/gratitude/FaithfulnessView";
import { LessonsList } from "@/components/lessons/LessonsList";
import { InstructionsList } from "@/components/instructions/InstructionsList";
import {
  DEFAULT_REMEMBER_SEGMENT,
  parseRememberSegment,
  type RememberSegment,
} from "@/lib/remember-segments";
import { spacing } from "@/theme/tokens";

const tabOptions: { value: RememberSegment; label: string }[] = [
  { value: "gratitudes", label: "Gratitude" },
  { value: "faithfulness", label: "Testimonies" },
  { value: "lessons", label: "Lessons" },
  { value: "instructions", label: "Instructions" },
];

export default function RememberScreen() {
  const params = useLocalSearchParams<{ segment?: string }>();
  const [tab, setTab] = useState<RememberSegment>(DEFAULT_REMEMBER_SEGMENT);

  // Keep the latest param readable inside the focus effect without making the
  // effect depend on it (which would re-run and clobber a manual selection).
  const segmentRef = useRef(params.segment);
  segmentRef.current = params.segment;

  // On each focus: honor an explicit `segment` param (e.g. arriving from a
  // "go to Remember > Instructions" link), then clear it so it isn't re-applied.
  // With no param we leave the current segment untouched, so returning from a
  // detail screen keeps you on the segment you were browsing.
  useFocusEffect(
    useCallback(() => {
      const raw = segmentRef.current;
      if (raw !== undefined) {
        setTab(parseRememberSegment(raw));
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
            label="Add testimony"
            onPress={() => router.push("/win/new")}
          />
        </View>
      ) : null}
      {tab === "lessons" ? (
        <View style={styles.addButton}>
          <Button label="Save a lesson" onPress={() => router.push("/lesson/new")} />
        </View>
      ) : null}
      {tab === "instructions" ? (
        <View style={styles.addButton}>
          <Button
            label="Add instruction"
            onPress={() => router.push("/instruction/new")}
          />
        </View>
      ) : null}

      <View style={styles.switcher}>
        <SegmentedControl options={tabOptions} value={tab} onChange={setTab} />
      </View>

      <View style={styles.browseTags}>
        <Button
          label="Browse tags"
          variant="secondary"
          onPress={() => router.push("/tags")}
        />
      </View>

      {tab === "gratitudes" ? <GratitudeList /> : null}
      {tab === "faithfulness" ? <FaithfulnessView /> : null}
      {tab === "lessons" ? <LessonsList /> : null}
      {tab === "instructions" ? <InstructionsList /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    marginBottom: spacing.lg,
  },
  switcher: {
    marginBottom: spacing.md,
  },
  browseTags: {
    marginBottom: spacing.lg,
  },
});
