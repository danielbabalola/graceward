import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import type { Tag } from "@graceward/shared";
import { TagChips } from "@/components/tags/TagChips";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

type ItemCardProps = {
  meta: string;
  content: string;
  onPress?: () => void;
  accentColor?: string;
  accessibilityLabel?: string;
  tags?: Tag[];
};

export function ItemCard({
  meta,
  content,
  onPress,
  accentColor,
  accessibilityLabel,
  tags,
}: ItemCardProps) {
  const accentStyle: ViewStyle | undefined = accentColor
    ? { borderColor: accentColor }
    : undefined;

  const inner = (
    <>
      <Text style={styles.meta}>{meta}</Text>
      <Text style={styles.content} numberOfLines={3}>
        {content}
      </Text>
      {tags && tags.length > 0 ? (
        <View style={styles.tags}>
          <TagChips tags={tags} />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.card, accentStyle]}>{inner}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        accentStyle,
        pressed && styles.pressed,
      ]}
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
    gap: spacing.xs,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
  },
  meta: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  content: {
    ...typography.body,
    color: colors.text,
  },
  tags: {
    marginTop: spacing.xs,
  },
});
