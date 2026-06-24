import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { colors, radii, spacing, touchTarget, typography } from "@/theme/tokens";

type ButtonVariant = "primary" | "secondary" | "destructive";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
};

const containerVariants: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primaryDeep,
    borderWidth: 1,
    borderColor: colors.primaryDeep,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.correctionAccent,
  },
};

const labelVariants: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.white },
  secondary: { color: colors.primaryDeep },
  destructive: { color: colors.correctionAccent },
};

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        containerVariants[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.white : colors.primaryDeep}
        />
      ) : (
        <Text style={[styles.label, labelVariants[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.lg,
    minHeight: touchTarget,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.cardTitle,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.9,
  },
});
