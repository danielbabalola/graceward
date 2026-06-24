import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { JournalEntry } from "@graceward/shared";
import { getJournalEntryById } from "@/lib/db";
import { sourceReflectionLabel } from "@/lib/journal-display";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type SourceReflectionLinkProps = {
  journalEntryId: string;
  /**
   * When true (default), the row opens the source reflection. When false it is
   * a calm, non-interactive note (used on create forms as a source preview).
   */
  pressable?: boolean;
};

/**
 * A calm, unobtrusive "From reflection" row that links an item back to the
 * journal entry it came from. Renders nothing while loading or if the source
 * reflection no longer exists (e.g. it was deleted), so callers can mount it
 * unconditionally whenever a source id is present.
 */
export function SourceReflectionLink({
  journalEntryId,
  pressable = true,
}: SourceReflectionLinkProps) {
  const [entry, setEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    let active = true;
    getJournalEntryById(journalEntryId)
      .then((result) => {
        if (active) {
          setEntry(result);
        }
      })
      .catch((error: unknown) => {
        // Never log raw entry content — only an error category.
        console.warn(
          "Failed to load source reflection:",
          error instanceof Error ? error.message : "unknown error",
        );
      });
    return () => {
      active = false;
    };
  }, [journalEntryId]);

  if (!entry) {
    return null;
  }

  const label = sourceReflectionLabel(entry);

  const inner = (
    <>
      <Text style={styles.eyebrow}>From reflection</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </>
  );

  if (!pressable) {
    return <View style={styles.card}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/journal/[id]", params: { id: entry.id } })
      }
      accessibilityRole="button"
      accessibilityLabel={`Open source reflection: ${label}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.92,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
});
