import { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/Button";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { Screen } from "@/components/ui/Screen";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GratitudeList } from "@/components/gratitude/GratitudeList";
import { FaithfulnessView } from "@/components/gratitude/FaithfulnessView";
import { LessonsList } from "@/components/lessons/LessonsList";
import { RevelationsList } from "@/components/revelations/RevelationsList";
import { InstructionsList } from "@/components/revelations/InstructionsList";
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
  { value: "revelations", label: "Revelations" },
  { value: "instructions", label: "Instructions" },
];

/**
 * Asks which kind of revelation to add, then opens the right create screen.
 * Revelations are the reflective kinds (a dream or a prophetic word);
 * instructions have their own segment and "Add instruction" button.
 */
function promptAddRevelation() {
  Alert.alert("Add a revelation", "What would you like to record?", [
    {
      text: "Dream",
      onPress: () =>
        router.push({ pathname: "/revelation/new", params: { kind: "dream" } }),
    },
    {
      text: "Prophecy",
      onPress: () =>
        router.push({
          pathname: "/revelation/new",
          params: { kind: "prophecy" },
        }),
    },
    { text: "Cancel", style: "cancel" },
  ]);
}

/**
 * The floating "+" action for the current segment: each kind of thing to
 * remember has its own create destination (revelations first ask which kind).
 */
function addActionForSegment(tab: RememberSegment): {
  label: string;
  onPress: () => void;
} {
  switch (tab) {
    case "gratitudes":
      return {
        label: "Add gratitude",
        onPress: () => router.push("/gratitude/new"),
      };
    case "faithfulness":
      return {
        label: "Add testimony",
        onPress: () => router.push("/win/new"),
      };
    case "lessons":
      return {
        label: "Save a lesson",
        onPress: () => router.push("/lesson/new"),
      };
    case "revelations":
      return { label: "Add revelation", onPress: promptAddRevelation };
    case "instructions":
      return {
        label: "Add instruction",
        onPress: () =>
          router.push({
            pathname: "/revelation/new",
            params: { kind: "instruction" },
          }),
      };
  }
}

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

  const addAction = addActionForSegment(tab);

  return (
    <Screen
      title="Remember"
      subtitle="Notice mercy, remember God's faithfulness, and hold what you're learning — one day at a time."
      floatingAction={
        <FloatingActionButton
          accessibilityLabel={addAction.label}
          onPress={addAction.onPress}
        />
      }
    >
      <View style={styles.switcher}>
        <SegmentedControl
          options={tabOptions}
          value={tab}
          onChange={setTab}
          wrap
        />
      </View>

      {tab === "gratitudes" ? <GratitudeList /> : null}
      {tab === "faithfulness" ? <FaithfulnessView /> : null}
      {tab === "lessons" ? <LessonsList /> : null}
      {tab === "revelations" ? <RevelationsList /> : null}
      {tab === "instructions" ? <InstructionsList /> : null}

      <View style={styles.browseTags}>
        <Button
          label="Browse tags"
          variant="secondary"
          onPress={() => router.push("/tags")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switcher: {
    marginBottom: spacing.md,
  },
  browseTags: {
    marginTop: spacing.lg,
  },
});
