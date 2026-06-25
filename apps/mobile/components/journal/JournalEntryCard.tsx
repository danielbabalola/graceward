import { StyleSheet, Text, View } from "react-native";
import type { JournalEntry } from "@graceward/shared";
import { PressableScale } from "@/components/ui/PressableScale";
import {
  entryPreview,
  formatEntryDate,
  inputTypeLabel,
  modeLabel,
} from "@/lib/journal-display";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

type JournalEntryCardProps = {
  entry: JournalEntry;
  onPress?: () => void;
};

export function JournalEntryCard({ entry, onPress }: JournalEntryCardProps) {
  const content = (
    <>
      <Text style={styles.meta}>
        {formatEntryDate(entry.entryDate)} · {modeLabel(entry.mode)} ·{" "}
        {inputTypeLabel(entry.inputType)}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {entryPreview(entry)}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open reflection: ${entryPreview(entry)}`}
      style={styles.card}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.card,
  },
  meta: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  preview: {
    ...typography.cardTitle,
    color: colors.text,
  },
});
