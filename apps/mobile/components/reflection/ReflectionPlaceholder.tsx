import { StyleSheet, Text, View } from "react-native";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type ReflectionPlaceholderProps = {
  title: string;
  subtitle: string;
  body: string;
  note?: string;
};

export function ReflectionPlaceholder({
  title,
  subtitle,
  body,
  note,
}: ReflectionPlaceholderProps) {
  return (
    <FlowScreen title={title} subtitle={subtitle}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Coming soon</Text>
        <Text style={styles.body}>{body}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
  note: {
    ...typography.bodySmall,
    color: colors.lamentAccent,
    fontStyle: "italic",
  },
});
