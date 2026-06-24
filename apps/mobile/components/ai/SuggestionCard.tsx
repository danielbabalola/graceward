import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type SuggestionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  footnote?: string;
  status: SaveStatus;
  saveLabel: string;
  savedLabel: string;
  onSave: () => void;
};

export function SuggestionCard({
  eyebrow,
  title,
  description,
  footnote,
  status,
  saveLabel,
  savedLabel,
  onSave,
}: SuggestionCardProps) {
  const saved = status === "saved";
  return (
    <View style={styles.card}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
      <Button
        label={saved ? savedLabel : saveLabel}
        variant="secondary"
        onPress={onSave}
        disabled={saved}
        loading={status === "saving"}
        style={styles.action}
      />
      {status === "error" ? (
        <Text style={styles.errorText}>
          Could not save just now. Tap to try again.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  footnote: {
    ...typography.bodySmall,
    color: colors.primaryDeep,
  },
  action: {
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
  },
});
