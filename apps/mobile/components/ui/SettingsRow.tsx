import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, touchTarget, typography } from "@/theme/tokens";

type SettingsRowProps = {
  title: string;
  description?: string;
};

export function SettingsRow({ title, description }: SettingsRowProps) {
  return (
    <View style={styles.row} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: touchTarget,
    justifyContent: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
