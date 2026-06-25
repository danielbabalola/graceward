import { useEffect } from "react";
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** A single shimmering placeholder block with a gentle breathing opacity. */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = radii.sm,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.border },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton that mirrors an ItemCard so loading doesn't shift layout. */
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="40%" height={10} />
      <Skeleton width="90%" height={16} />
      <Skeleton width="65%" height={16} />
    </View>
  );
}

/** A short stack of card skeletons for list/dashboard loading states. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.low,
  },
});
