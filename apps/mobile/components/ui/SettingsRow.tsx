import { StyleSheet, Switch, Text, View } from "react-native";
import { colors, radii, spacing, touchTarget, typography } from "@/theme/tokens";

type SettingsRowProps = {
  title: string;
  description?: string;
  /**
   * When provided, the row renders a trailing toggle. The row stays text-only
   * (no switch) when this is omitted, so existing informational rows are
   * unaffected.
   */
  onToggle?: (value: boolean) => void;
  toggleValue?: boolean;
  toggleDisabled?: boolean;
};

export function SettingsRow({
  title,
  description,
  onToggle,
  toggleValue,
  toggleDisabled,
}: SettingsRowProps) {
  const hasToggle = onToggle !== undefined;

  const text = (
    <View style={hasToggle ? styles.textColumn : undefined}>
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </View>
  );

  if (!hasToggle) {
    return (
      <View style={styles.row} accessibilityRole="text">
        {text}
      </View>
    );
  }

  return (
    <View
      style={styles.row}
      accessibilityRole="switch"
      accessibilityState={{ checked: toggleValue, disabled: toggleDisabled }}
      accessibilityLabel={title}
    >
      <View style={styles.toggleLayout}>
        {text}
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          disabled={toggleDisabled}
          trackColor={{ false: colors.border, true: colors.sage }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.border}
        />
      </View>
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
  toggleLayout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  textColumn: {
    flex: 1,
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
