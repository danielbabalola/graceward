import { StyleSheet, Text, View } from "react-native";
import type { PrayerRequest } from "@graceward/shared";
import { PressableScale } from "@/components/ui/PressableScale";
import { prayerMetaLine, prayerPreview } from "@/lib/prayer-display";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

type PrayerRequestCardProps = {
  request: PrayerRequest;
  onPress?: () => void;
};

export function PrayerRequestCard({ request, onPress }: PrayerRequestCardProps) {
  const answered = request.status === "answered";

  const content = (
    <>
      <Text style={[styles.meta, answered && styles.metaAnswered]}>
        {prayerMetaLine(request)}
      </Text>
      <Text style={styles.title} numberOfLines={1}>
        {request.title}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {prayerPreview(request)}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.card, answered && styles.cardAnswered]}>
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open prayer request: ${request.title}`}
      style={[styles.card, answered && styles.cardAnswered]}
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
  cardAnswered: {
    borderColor: colors.answeredPrayerAccent,
  },
  meta: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  metaAnswered: {
    color: colors.answeredPrayerAccent,
  },
  title: {
    ...typography.cardTitle,
    color: colors.text,
  },
  preview: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
