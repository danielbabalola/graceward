import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Tag } from "@graceward/shared";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type TagChipsProps = {
  tags: Tag[];
  /** When provided, each chip becomes tappable (e.g. to open the tag browse). */
  onPressTag?: (tag: Tag) => void;
};

/** Read-only row of tag chips shown on detail screens and list cards. */
export function TagChips({ tags, onPressTag }: TagChipsProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {tags.map((tag) =>
        onPressTag ? (
          <Pressable
            key={tag.id}
            onPress={() => onPressTag(tag)}
            accessibilityRole="button"
            accessibilityLabel={`Open tag ${tag.name}`}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Text style={styles.chipText}>{tag.name}</Text>
          </Pressable>
        ) : (
          <View key={tag.id} style={styles.chip}>
            <Text style={styles.chipText}>{tag.name}</Text>
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.primaryDeep,
    fontWeight: "500",
  },
});
