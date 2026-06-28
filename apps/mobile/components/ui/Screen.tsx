import { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme/tokens";

type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  contentStyle?: ViewStyle;
  /**
   * Optional element pinned above the scrolling content at the bottom-right
   * (e.g. a FloatingActionButton). It stays in place while the list scrolls, so
   * a primary action remains reachable without crowding the top of the screen.
   */
  floatingAction?: ReactNode;
};

export function Screen({
  title,
  subtitle,
  children,
  contentStyle,
  floatingAction,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          floatingAction ? styles.contentWithFab : null,
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
      {floatingAction ? (
        <View style={styles.floatingAction} pointerEvents="box-none">
          {floatingAction}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundCream,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // Extra bottom room so the floating action never covers the last list item.
  contentWithFab: {
    paddingBottom: spacing.xxl + 72,
  },
  floatingAction: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
});
