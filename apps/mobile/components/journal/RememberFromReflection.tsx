import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/theme/tokens";

type RememberFromReflectionProps = {
  journalEntryId: string;
};

/**
 * Calm actions that let a user manually carry something forward from a saved
 * reflection into a linked prayer request, gratitude, or faithfulness moment.
 * No AI, no auto-extraction — the user writes the specific item themselves on
 * the create screen, which receives the source reflection id.
 */
export function RememberFromReflection({
  journalEntryId,
}: RememberFromReflectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Remember from this reflection</Text>
      <Text style={styles.hint}>
        Carry something forward in your own words. Nothing is copied for you.
      </Text>
      <Button
        label="Add prayer request"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/prayer/new",
            params: { sourceJournalEntryId: journalEntryId },
          })
        }
        style={styles.action}
      />
      <Button
        label="Add gratitude"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/gratitude/new",
            params: { sourceJournalEntryId: journalEntryId },
          })
        }
        style={styles.action}
      />
      <Button
        label="Save faithfulness moment"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/win/new",
            params: { sourceJournalEntryId: journalEntryId },
          })
        }
        style={styles.action}
      />
      <Button
        label="Save lesson"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/lesson/new",
            params: { sourceJournalEntryId: journalEntryId },
          })
        }
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  action: {
    marginBottom: spacing.xs,
  },
});
