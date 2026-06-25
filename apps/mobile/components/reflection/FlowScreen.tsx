import { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, touchTarget, typography } from "@/theme/tokens";

type FlowScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBack?: boolean;
};

export function FlowScreen({
  title,
  subtitle,
  children,
  showBack = true,
}: FlowScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primaryDeep} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        ) : null}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  backLabel: {
    ...typography.body,
    color: colors.primaryDeep,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    paddingTop: spacing.sm,
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
