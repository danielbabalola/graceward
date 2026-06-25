import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  /** Optional action(s), e.g. a Button, rendered below the copy. */
  children?: ReactNode;
};

/**
 * A calm, centered empty state with a haloed icon. Replaces the bare "subtle"
 * text cards so the many first-run empty surfaces feel intentional and warm
 * rather than like missing content.
 */
export function EmptyState({
  icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconHalo}>
        <Ionicons name={icon} size={26} color={colors.primaryDeep} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#F5F0E8",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconHalo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
    textAlign: "center",
  },
  description: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
  },
  actions: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
