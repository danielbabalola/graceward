import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type AppearingViewProps = {
  children: ReactNode;
  /** Position in a list; used to stagger the entrance. */
  index?: number;
  /** Per-item stagger delay in ms. */
  stagger?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fades and lifts its children into place on mount, with an optional
 * index-based stagger so lists cascade in gently rather than popping. Used for
 * dashboard sections and list rows to give content a calm sense of arrival.
 */
export function AppearingView({
  children,
  index = 0,
  stagger = 55,
  style,
}: AppearingViewProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(380)
        .delay(index * stagger)
        .springify()
        .damping(20)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
