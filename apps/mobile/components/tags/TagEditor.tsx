import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CANONICAL_TAGS } from "@graceward/ai-schemas";
import {
  dedupeTagNames,
  listAllTags,
  normalizeTagName,
  normalizeTagSlug,
} from "@/lib/db";
import { colors, radii, spacing, touchTarget, typography } from "@/theme/tokens";

type TagEditorProps = {
  value: string[];
  onChange: (names: string[]) => void;
  label?: string;
  placeholder?: string;
};

const MAX_SUGGESTIONS = 6;

/**
 * Multi-tag input: shows the applied tags as removable chips, an add field, and
 * suggestions drawn from the user's existing tags so the shared vocabulary
 * stays consistent. Tags are deduped case/spacing-insensitively.
 */
export function TagEditor({
  value,
  onChange,
  label = "Tags (optional)",
  placeholder = "Add a tag, e.g. Provision",
}: TagEditorProps) {
  const [draft, setDraft] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    listAllTags()
      .then((tags) => {
        if (active) {
          setAllTags(tags.map((tag) => tag.name));
        }
      })
      .catch(() => {
        // Suggestions are a convenience only; ignore read failures.
      });
    return () => {
      active = false;
    };
  }, []);

  const appliedSlugs = new Set(value.map((name) => normalizeTagSlug(name)));

  function addTag(name: string) {
    const clean = normalizeTagName(name);
    if (!clean) {
      return;
    }
    onChange(dedupeTagNames([...value, clean]));
    setDraft("");
  }

  function removeTag(target: string) {
    const targetSlug = normalizeTagSlug(target);
    onChange(value.filter((name) => normalizeTagSlug(name) !== targetSlug));
  }

  const draftSlug = normalizeTagSlug(draft);
  // The user's own tags come first (their established vocabulary), then the
  // shared canonical seeds fill in so suggestions are never empty for a new
  // user. Deduped case/spacing-insensitively, applied tags removed.
  const suggestionPool = dedupeTagNames([...allTags, ...CANONICAL_TAGS]);
  const suggestions = suggestionPool
    .filter((name) => {
      const slug = normalizeTagSlug(name);
      if (appliedSlugs.has(slug)) {
        return false;
      }
      return draftSlug.length === 0 ? true : slug.includes(draftSlug);
    })
    .slice(0, MAX_SUGGESTIONS);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {value.length > 0 ? (
        <View style={styles.chipRow}>
          {value.map((name) => (
            <Pressable
              key={normalizeTagSlug(name)}
              onPress={() => removeTag(name)}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${name}`}
              style={({ pressed }) => [
                styles.activeChip,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.activeChipText}>{name}</Text>
              <Text style={styles.removeIcon}>{"\u00D7"}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={() => addTag(draft)}
          accessibilityLabel={label}
        />
        {draft.trim().length > 0 ? (
          <Pressable
            onPress={() => addTag(draft)}
            accessibilityRole="button"
            accessibilityLabel={`Add tag ${draft.trim()}`}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      {suggestions.length > 0 ? (
        <View style={styles.chipRow}>
          {suggestions.map((name) => (
            <Pressable
              key={normalizeTagSlug(name)}
              onPress={() => addTag(name)}
              accessibilityRole="button"
              accessibilityLabel={`Add existing tag ${name}`}
              style={({ pressed }) => [
                styles.suggestionChip,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.suggestionChipText}>{name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    ...typography.cardTitle,
    color: colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  activeChipText: {
    ...typography.bodySmall,
    color: colors.primaryDeep,
    fontWeight: "500",
  },
  removeIcon: {
    ...typography.body,
    color: colors.primaryDeep,
    lineHeight: 18,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget,
  },
  addButton: {
    minHeight: touchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.md,
  },
  addButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: "600",
  },
  suggestionChip: {
    backgroundColor: colors.backgroundCream,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  suggestionChipText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.8,
  },
});
