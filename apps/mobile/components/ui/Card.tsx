import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, radii, shadows, spacing, touchTarget, typography } from "@/theme/tokens";

type CardVariant = "default" | "primary" | "subtle";

type CardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle;
  children?: ReactNode;
};

const variantStyles: Record<
  CardVariant,
  { container: ViewStyle; titleColor: string; descriptionColor: string }
> = {
  default: {
    container: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    titleColor: colors.text,
    descriptionColor: colors.textMuted,
  },
  primary: {
    container: {
      backgroundColor: colors.primaryLight,
      borderColor: "#C5E4F7",
    },
    titleColor: colors.primaryDeep,
    descriptionColor: colors.textMuted,
  },
  subtle: {
    container: {
      backgroundColor: "#F5F0E8",
      borderColor: colors.border,
    },
    titleColor: colors.text,
    descriptionColor: colors.textSubtle,
  },
};

export function Card({
  title,
  description,
  eyebrow,
  variant = "default",
  onPress,
  style,
  children,
}: CardProps) {
  const palette = variantStyles[variant];
  const content = (
    <View style={[styles.container, palette.container, style]}>
      {eyebrow ? (
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      ) : null}
      <Text style={[styles.title, { color: palette.titleColor }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: palette.descriptionColor }]}>
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    minHeight: touchTarget,
    ...shadows.card,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  title: {
    ...typography.cardTitle,
  },
  description: {
    ...typography.bodySmall,
  },
  pressed: {
    opacity: 0.92,
  },
});
