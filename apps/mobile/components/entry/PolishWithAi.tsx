import { useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { StructurableEntryType } from "@graceward/ai-schemas";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import {
  structureTextEntry,
  TextEntryApiError,
} from "@/lib/api/text-entry";
import {
  acknowledgeAiTextPolishConsent,
  hasAcknowledgedAiTextPolishConsent,
} from "@/lib/db";
import { formatEntryDate } from "@/lib/journal-display";
import {
  mergeTagNames,
  polishApplicableFields,
  type PolishApplicableFields,
} from "@/lib/voice-entry-fields";
import { colors, radii, spacing, typography } from "@/theme/tokens";

/** The form's current values, read at apply time so Undo can restore them. */
type CurrentValues = {
  title?: string;
  content?: string;
  tags?: string[];
  date?: string | null;
};

type Props = {
  /** Which kind of entry the typed note should be structured into. */
  entryType: StructurableEntryType;
  /** Today's local date (YYYY-MM-DD) so any stated follow-up time resolves. */
  entryDate: string;
  /**
   * Returns the user's current typed text to send for polishing. Called at tap
   * time so it always reflects the latest input. Return "" when nothing useful
   * has been typed yet.
   */
  getText: () => string;
  /** Disables the action (e.g. while the form is saving). */
  disabled?: boolean;
  /**
   * Granular appliers — provide only the ones this entry form has a field for.
   * Each is called when the user taps to apply (or undo) that one suggestion, so
   * applying a title never touches the content the user wrote, and vice versa.
   */
  onApplyTitle?: (title: string) => void;
  onApplyContent?: (content: string) => void;
  /** Receives the full tag list to set (merge is handled here, before calling). */
  onApplyTags?: (tags: string[]) => void;
  onApplyDate?: (date: string | null) => void;
  /**
   * Reads the form's current values. Called the instant before a suggestion is
   * applied to snapshot what was there, so Undo can restore it exactly.
   */
  getCurrentValues?: () => CurrentValues;
  /** Field nouns used in the suggestion labels (e.g. "name", "details"). */
  titleNoun?: string;
  contentNoun?: string;
  dateNoun?: string;
};

const PRIVACY_BODY =
  "This sends what you typed to Graceward to tidy it up and suggest a title and tags. Nothing is sent unless you choose this, and your text isn't kept after it's processed.";

/** A preview longer than this gets a "Show more" toggle (it likely truncates). */
const PREVIEW_EXPAND_THRESHOLD = 90;

type FieldKey = "title" | "content" | "tags" | "date";

type AppliedState = {
  title?: { prev: string };
  content?: { prev: string };
  tags?: { prev: string[] };
  date?: { prev: string | null };
};

/**
 * An explicit "Polish with AI" action for the typed entry forms. On tap it
 * sends the user's own text to Graceward, which cleans it up and suggests a
 * title, tidied details, and tags. Rather than overwriting the form, the
 * suggestions are shown as separate pieces the user applies one at a time (or
 * all at once); each can be previewed in full and undone to restore what was
 * there before. Nothing is sent until the user taps the button and confirms the
 * privacy notice the first time; a failure never changes what the user typed.
 */
export function PolishWithAi({
  entryType,
  entryDate,
  getText,
  disabled = false,
  onApplyTitle,
  onApplyContent,
  onApplyTags,
  onApplyDate,
  getCurrentValues,
  titleNoun = "title",
  contentNoun = "details",
  dateNoun = "date",
}: Props) {
  const [processing, setProcessing] = useState(false);
  const [suggestion, setSuggestion] = useState<PolishApplicableFields | null>(
    null,
  );
  const [applied, setApplied] = useState<AppliedState>({});
  const [expanded, setExpanded] = useState<Set<FieldKey>>(new Set());
  // Guards the whole interaction (consent prompt + request) so rapid double
  // taps can't open duplicate prompts or fire duplicate requests.
  const inFlightRef = useRef(false);

  async function runPolish(text: string) {
    setProcessing(true);
    try {
      const result = await structureTextEntry({ entryType, entryDate, text });
      // Only a success surfaces suggestions — a failure never overwrites or
      // clears what the user has typed, and never touches the form fields.
      setSuggestion(polishApplicableFields(result));
      setApplied({});
      setExpanded(new Set());
    } catch (error: unknown) {
      const message =
        error instanceof TextEntryApiError
          ? error.message
          : "Something went wrong. Please try again.";
      Alert.alert("Couldn't polish this", message);
    } finally {
      setProcessing(false);
    }
  }

  function handlePress() {
    if (inFlightRef.current || processing) {
      return;
    }
    const text = getText().trim();
    if (text.length === 0) {
      Alert.alert(
        "Write a little first",
        "Type a few words and Graceward can help tidy them up and suggest a title and tags.",
      );
      return;
    }

    inFlightRef.current = true;
    const release = () => {
      inFlightRef.current = false;
    };

    void (async () => {
      let acknowledged = false;
      try {
        acknowledged = await hasAcknowledgedAiTextPolishConsent();
      } catch {
        acknowledged = false;
      }

      if (acknowledged) {
        try {
          await runPolish(text);
        } finally {
          release();
        }
        return;
      }

      Alert.alert(
        "Polish this with Graceward?",
        PRIVACY_BODY,
        [
          { text: "Cancel", style: "cancel", onPress: release },
          {
            text: "Continue",
            onPress: () => {
              void (async () => {
                try {
                  await acknowledgeAiTextPolishConsent();
                  await runPolish(text);
                } finally {
                  release();
                }
              })();
            },
          },
        ],
        { cancelable: true, onDismiss: release },
      );
    })();
  }

  // Which suggestion rows can actually be shown: a value was produced AND the
  // parent form has a field (handler) for it.
  const showTitle = Boolean(onApplyTitle && suggestion?.title);
  const showContent = Boolean(onApplyContent && suggestion?.content);
  const showTags = Boolean(
    onApplyTags && suggestion && suggestion.tags.length > 0,
  );
  const showDate = Boolean(onApplyDate && suggestion?.date);
  const rowCount =
    Number(showTitle) + Number(showContent) + Number(showTags) + Number(showDate);

  function snapshot(): CurrentValues {
    return getCurrentValues?.() ?? {};
  }

  function applyTitle() {
    if (suggestion?.title && onApplyTitle) {
      const prev = snapshot().title ?? "";
      onApplyTitle(suggestion.title);
      setApplied((a) => ({ ...a, title: { prev } }));
    }
  }
  function undoTitle() {
    if (applied.title && onApplyTitle) {
      onApplyTitle(applied.title.prev);
      setApplied(({ title: _omit, ...rest }) => rest);
    }
  }
  function applyContent() {
    if (suggestion?.content && onApplyContent) {
      const prev = snapshot().content ?? "";
      onApplyContent(suggestion.content);
      setApplied((a) => ({ ...a, content: { prev } }));
    }
  }
  function undoContent() {
    if (applied.content && onApplyContent) {
      onApplyContent(applied.content.prev);
      setApplied(({ content: _omit, ...rest }) => rest);
    }
  }
  function applyTags() {
    if (suggestion && onApplyTags && suggestion.tags.length > 0) {
      // Merge suggested tags into the user's existing ones (the "Add"
      // affordance), snapshotting the prior list so Undo can restore it exactly.
      const prev = snapshot().tags ?? [];
      onApplyTags(mergeTagNames(prev, suggestion.tags));
      setApplied((a) => ({ ...a, tags: { prev } }));
    }
  }
  function undoTags() {
    if (applied.tags && onApplyTags) {
      onApplyTags(applied.tags.prev);
      setApplied(({ tags: _omit, ...rest }) => rest);
    }
  }
  function applyDate() {
    if (suggestion?.date && onApplyDate) {
      const prev = snapshot().date ?? null;
      onApplyDate(suggestion.date);
      setApplied((a) => ({ ...a, date: { prev } }));
    }
  }
  function undoDate() {
    if (applied.date && onApplyDate) {
      onApplyDate(applied.date.prev);
      setApplied(({ date: _omit, ...rest }) => rest);
    }
  }

  const allApplied =
    (!showTitle || Boolean(applied.title)) &&
    (!showContent || Boolean(applied.content)) &&
    (!showTags || Boolean(applied.tags)) &&
    (!showDate || Boolean(applied.date));

  function applyAll() {
    if (showTitle && !applied.title) applyTitle();
    if (showContent && !applied.content) applyContent();
    if (showTags && !applied.tags) applyTags();
    if (showDate && !applied.date) applyDate();
  }
  function undoAll() {
    if (applied.title) undoTitle();
    if (applied.content) undoContent();
    if (applied.tags) undoTags();
    if (applied.date) undoDate();
  }

  function toggleExpanded(key: FieldKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <View style={styles.wrapper}>
      {suggestion && rowCount > 0 ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>
              Graceward's suggestions — apply what helps
            </Text>
            {rowCount >= 2 ? (
              <ActionButton
                label={allApplied ? "Undo all" : "Use all"}
                variant={allApplied ? "undo" : "apply"}
                onPress={allApplied ? undoAll : applyAll}
                accessibilityLabel={
                  allApplied ? "Undo all suggestions" : "Use all suggestions"
                }
              />
            ) : null}
          </View>

          {showTitle && suggestion.title ? (
            <SuggestionRow
              fieldKey="title"
              label={`Suggested ${titleNoun}`}
              preview={suggestion.title}
              applied={Boolean(applied.title)}
              expanded={expanded.has("title")}
              onToggleExpand={() => toggleExpanded("title")}
              onApply={applyTitle}
              onUndo={undoTitle}
              applyLabel="Use"
              accessibilityNoun={titleNoun}
            />
          ) : null}

          {showContent && suggestion.content ? (
            <SuggestionRow
              fieldKey="content"
              label={`Tidied ${contentNoun}`}
              preview={suggestion.content}
              applied={Boolean(applied.content)}
              expanded={expanded.has("content")}
              onToggleExpand={() => toggleExpanded("content")}
              onApply={applyContent}
              onUndo={undoContent}
              applyLabel="Use"
              accessibilityNoun={contentNoun}
            />
          ) : null}

          {showTags ? (
            <SuggestionRow
              fieldKey="tags"
              label="Suggested tags"
              preview={suggestion.tags.join("  ·  ")}
              applied={Boolean(applied.tags)}
              expanded={expanded.has("tags")}
              onToggleExpand={() => toggleExpanded("tags")}
              onApply={applyTags}
              onUndo={undoTags}
              applyLabel="Add"
              accessibilityNoun="tags"
            />
          ) : null}

          {showDate && suggestion.date ? (
            <SuggestionRow
              fieldKey="date"
              label={`Suggested ${dateNoun}`}
              preview={formatEntryDate(suggestion.date)}
              applied={Boolean(applied.date)}
              expanded={expanded.has("date")}
              onToggleExpand={() => toggleExpanded("date")}
              onApply={applyDate}
              onUndo={undoDate}
              applyLabel="Use"
              accessibilityNoun={dateNoun}
            />
          ) : null}
        </View>
      ) : null}

      <Button
        label={
          processing
            ? "Polishing…"
            : suggestion
              ? "Polish again"
              : "Polish with AI"
        }
        variant="secondary"
        onPress={handlePress}
        loading={processing}
        disabled={disabled || processing}
      />
    </View>
  );
}

type SuggestionRowProps = {
  fieldKey: FieldKey;
  label: string;
  preview: string;
  applied: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onApply: () => void;
  onUndo: () => void;
  applyLabel: string;
  accessibilityNoun: string;
};

function SuggestionRow({
  label,
  preview,
  applied,
  expanded,
  onToggleExpand,
  onApply,
  onUndo,
  applyLabel,
  accessibilityNoun,
}: SuggestionRowProps) {
  const canExpand = preview.length > PREVIEW_EXPAND_THRESHOLD;
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text
          style={styles.rowPreview}
          numberOfLines={expanded ? undefined : 2}
        >
          {preview}
        </Text>
        {canExpand ? (
          <PressableScale
            onPress={onToggleExpand}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? `Show less of the suggested ${accessibilityNoun}`
                : `Show the full suggested ${accessibilityNoun}`
            }
            style={styles.expandToggle}
          >
            <Text style={styles.expandLabel}>
              {expanded ? "Show less" : "Show more"}
            </Text>
          </PressableScale>
        ) : null}
      </View>
      <ActionButton
        label={applied ? "Undo" : applyLabel}
        variant={applied ? "undo" : "apply"}
        onPress={applied ? onUndo : onApply}
        accessibilityLabel={
          applied
            ? `Undo suggested ${accessibilityNoun}`
            : `${applyLabel} suggested ${accessibilityNoun}`
        }
      />
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  variant: "apply" | "undo";
  onPress: () => void;
  accessibilityLabel: string;
};

function ActionButton({
  label,
  variant,
  onPress,
  accessibilityLabel,
}: ActionButtonProps) {
  const isUndo = variant === "undo";
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.actionButton, isUndo && styles.actionButtonUndo]}
    >
      <Text
        style={[styles.actionLabel, isUndo && styles.actionLabelUndo]}
      >
        {isUndo ? `${label} ↺` : label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  panel: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  panelTitle: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  rowText: {
    flexShrink: 1,
    flexGrow: 1,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
  },
  rowPreview: {
    ...typography.bodySmall,
    color: colors.text,
  },
  expandToggle: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  expandLabel: {
    ...typography.caption,
    color: colors.primaryDeep,
    fontWeight: "600",
  },
  actionButton: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.primaryDeep,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonUndo: {
    borderColor: colors.textSubtle,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.primaryDeep,
  },
  actionLabelUndo: {
    color: colors.textMuted,
  },
});
