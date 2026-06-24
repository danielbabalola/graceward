import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Button } from "@/components/ui/Button";
import { formatEntryDate } from "@/lib/journal-display";
import { colors, radii, shadows, spacing, touchTarget, typography } from "@/theme/tokens";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** The editable shape of a suggestion. Unused fields are "" / null. */
export type SuggestionDraft = {
  title: string;
  description: string;
  tag: string;
  followUpAt: string | null;
};

type SuggestionCardProps = {
  /** Field label shown when editing the main text (e.g. "Prayer focus"). */
  titleLabel: string;
  /** Allow the main text to wrap across lines when editing. */
  titleMultiline?: boolean;
  /** When set, a multiline description field is shown (prayer only). */
  descriptionLabel?: string;
  /** When set, an editable tag/category field is shown (shown as eyebrow). */
  tagLabel?: string;
  /** When true, an editable follow-up date field is shown (prayer only). */
  supportsFollowUp?: boolean;
  initial: SuggestionDraft;
  status: SaveStatus;
  saveLabel: string;
  savedLabel: string;
  onSave: (draft: SuggestionDraft) => void;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

/** Local calendar date as YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function SuggestionCard({
  titleLabel,
  titleMultiline = false,
  descriptionLabel,
  tagLabel,
  supportsFollowUp = false,
  initial,
  status,
  saveLabel,
  savedLabel,
  onSave,
}: SuggestionCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [tag, setTag] = useState(initial.tag);
  const [followUp, setFollowUp] = useState(initial.followUpAt ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const saved = status === "saved";

  function beginEdit() {
    setValidationError(null);
    setEditing(true);
  }

  function cancelEdit() {
    // Revert any in-progress edits back to the last committed values.
    setTitle(initial.title);
    setDescription(initial.description);
    setTag(initial.tag);
    setFollowUp(initial.followUpAt ?? "");
    setValidationError(null);
    setEditing(false);
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setValidationError("Add a little text before saving.");
      return;
    }
    const trimmedFollowUp = followUp.trim();
    if (supportsFollowUp && trimmedFollowUp.length > 0) {
      if (!isValidIsoDate(trimmedFollowUp)) {
        setValidationError("Use the date format YYYY-MM-DD, or clear it.");
        return;
      }
    }
    setValidationError(null);
    setEditing(false);
    onSave({
      title: trimmedTitle,
      description: description.trim(),
      tag: tag.trim(),
      followUpAt:
        supportsFollowUp && trimmedFollowUp.length > 0 ? trimmedFollowUp : null,
    });
  }

  if (editing) {
    return (
      <View style={styles.card}>
        {tagLabel ? (
          <Field label={tagLabel}>
            <TextInput
              value={tag}
              onChangeText={setTag}
              placeholder="Optional"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              accessibilityLabel={tagLabel}
            />
          </Field>
        ) : null}

        <Field label={titleLabel}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            multiline={titleMultiline}
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, titleMultiline && styles.inputMultiline]}
            accessibilityLabel={titleLabel}
          />
        </Field>

        {descriptionLabel ? (
          <Field label={descriptionLabel}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Optional"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, styles.inputMultiline]}
              accessibilityLabel={descriptionLabel}
            />
          </Field>
        ) : null}

        {supportsFollowUp ? (
          <FollowUpDateField value={followUp} onChange={setFollowUp} />
        ) : null}

        {validationError ? (
          <Text style={styles.errorText}>{validationError}</Text>
        ) : null}

        <View style={styles.actionRow}>
          <Button
            label="Cancel"
            variant="secondary"
            onPress={cancelEdit}
            style={styles.actionFlex}
          />
          <Button
            label={saveLabel}
            onPress={handleSave}
            loading={status === "saving"}
            style={styles.actionFlex}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {tag ? <Text style={styles.eyebrow}>{tag}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {supportsFollowUp && followUp ? (
        <Text style={styles.footnote}>
          Follow-up: {formatEntryDate(followUp)}
        </Text>
      ) : null}

      <View style={styles.actionRow}>
        {!saved ? (
          <Button
            label="Edit"
            variant="secondary"
            onPress={beginEdit}
            style={styles.actionFlex}
          />
        ) : null}
        <Button
          label={saved ? savedLabel : saveLabel}
          variant={saved ? "secondary" : "primary"}
          onPress={() => onSave(buildDraft())}
          disabled={saved}
          loading={status === "saving"}
          style={styles.actionFlex}
        />
      </View>
      {status === "error" ? (
        <Text style={styles.errorText}>
          Could not save just now. Tap to try again.
        </Text>
      ) : null}
    </View>
  );

  function buildDraft(): SuggestionDraft {
    const trimmedFollowUp = followUp.trim();
    return {
      title: title.trim(),
      description: description.trim(),
      tag: tag.trim(),
      followUpAt:
        supportsFollowUp && trimmedFollowUp.length > 0 ? trimmedFollowUp : null,
    };
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function FollowUpDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const selected = value ? parseIsoDate(value) : null;
  const today = startOfToday();

  function handlePicked(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS !== "ios") {
      setShowPicker(false);
    }
    if (event.type === "set" && date) {
      onChange(toIsoDate(date));
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Follow-up date</Text>
      <View style={styles.dateRow}>
        <Pressable
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          style={styles.dateChip}
        >
          <Text style={selected ? styles.dateChipText : styles.dateChipPlaceholder}>
            {selected ? formatEntryDate(value) : "Add a follow-up date"}
          </Text>
        </Pressable>
        {selected ? (
          <Pressable
            onPress={() => {
              onChange("");
              setShowPicker(false);
            }}
            accessibilityRole="button"
            style={styles.dateClear}
          >
            <Text style={styles.dateClearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {showPicker ? (
        Platform.OS === "ios" ? (
          <View style={styles.iosPickerWrap}>
            <DateTimePicker
              value={selected ?? today}
              mode="date"
              display="inline"
              minimumDate={today}
              onChange={handlePicked}
            />
            <Button
              label="Done"
              variant="secondary"
              onPress={() => setShowPicker(false)}
            />
          </View>
        ) : (
          <DateTimePicker
            value={selected ?? today}
            mode="date"
            display="default"
            minimumDate={today}
            onChange={handlePicked}
          />
        )
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
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.backgroundCream,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dateChip: {
    flex: 1,
    minHeight: touchTarget,
    justifyContent: "center",
    backgroundColor: colors.backgroundCream,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dateChipText: {
    ...typography.body,
    color: colors.text,
  },
  dateChipPlaceholder: {
    ...typography.body,
    color: colors.textSubtle,
  },
  dateClear: {
    minHeight: touchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  dateClearText: {
    ...typography.bodySmall,
    color: colors.primaryDeep,
  },
  iosPickerWrap: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionFlex: {
    flex: 1,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
  },
});
