import { ReactNode } from "react";
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { haptics } from "@/lib/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticStyle = "light" | "medium" | "selection" | "none";

type PressableScaleProps = Omit<PressableProps, "style"> & {
  children: ReactNode;
  /** Target scale while pressed. Smaller = more pronounced squish. */
  scaleTo?: number;
  /** Haptic fired on press-in. Defaults to a subtle selection tick. */
  haptic?: HapticStyle;
  style?: StyleProp<ViewStyle>;
};

const SPRING = { damping: 18, stiffness: 320, mass: 0.5 } as const;

/**
 * Pressable that springs down slightly on touch and fires a haptic, replacing
 * the app's old flat `opacity` press feedback. Shared by Button, Card, and
 * ItemCard so the same tactile motion shows up everywhere a surface is tapped.
 */
export function PressableScale({
  children,
  scaleTo = 0.97,
  haptic = "selection",
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn(event: GestureResponderEvent) {
    if (!disabled) {
      scale.value = withSpring(scaleTo, SPRING);
      if (haptic !== "none") {
        haptics[haptic]();
      }
    }
    onPressIn?.(event);
  }

  function handlePressOut(event: GestureResponderEvent) {
    scale.value = withSpring(1, SPRING);
    onPressOut?.(event);
  }

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
