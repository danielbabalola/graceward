import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, spacing, typography } from "@/theme/tokens";

/**
 * A living "Recording…" indicator: a breathing dot with an expanding halo that
 * loops continuously, so the most important moment in the app (capturing a
 * reflection) feels active rather than static text.
 */
export function RecordingIndicator() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 0.85 + pulse.value * 0.3 }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.3 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.8 }],
  }));

  return (
    <View style={styles.row}>
      <View style={styles.dotWrap}>
        <Animated.View style={[styles.halo, haloStyle]} />
        <Animated.View style={[styles.dot, dotStyle]} />
      </View>
      <Text style={styles.label}>Recording…</Text>
    </View>
  );
}

const DOT = 12;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  dotWrap: {
    width: DOT,
    height: DOT,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.correctionAccent,
  },
  halo: {
    position: "absolute",
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.correctionAccent,
  },
  label: {
    ...typography.body,
    color: colors.correctionAccent,
  },
});
