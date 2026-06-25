import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import type { Tag } from "@graceward/shared";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type TagFilterBarProps = {
  tags: Tag[];
  selectedId: string | null;
  onSelect: (tagId: string | null) => void;
};

/**
 * Horizontal row of tag chips for filtering a list. The leading "All" chip
 * clears the filter. Renders nothing when there are no tags to filter by.
 */
export function TagFilterBar({ tags, selectedId, onSelect }: TagFilterBarProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      <FilterChip
        label="All"
        active={selectedId === null}
        onPress={() => onSelect(null)}
      />
      {tags.map((tag) => (
        <FilterChip
          key={tag.id}
          label={tag.name}
          active={selectedId === tag.id}
          onPress={() => onSelect(selectedId === tag.id ? null : tag.id)}
        />
      ))}
    </ScrollView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Filter by ${label}`}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: spacing.md,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep,
  },
  pressed: {
    opacity: 0.8,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.white,
  },
});
