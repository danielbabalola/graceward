import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { RevelationKind } from "@graceward/shared";
import type { StructureVoiceEntryResponse } from "@graceward/ai-schemas";
import { Button } from "@/components/ui/Button";
import { DateSelector } from "@/components/ui/DateSelector";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import { PolishWithAi } from "@/components/entry/PolishWithAi";
import { VoiceEntryCapture } from "@/components/entry/VoiceEntryCapture";
import { TagEditor } from "@/components/tags/TagEditor";
import { createRevelation, toLocalDateString } from "@/lib/db";
import {
  hasTypedEntryContent,
  safeFollowUpDate,
  suggestionTags,
} from "@/lib/voice-entry-fields";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type KindCopy = {
  screenTitle: string;
  subtitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  contentLabel: string;
  contentPlaceholder: string;
  /** Lowercase noun for the content field, used in AI suggestion labels. */
  contentNoun: string;
  /** Label for the optional "when it happened" date (dream/prophecy only). */
  occurredLabel: string;
  tagPlaceholder: string;
  saveLabel: string;
};

const KIND_COPY: Record<RevelationKind, KindCopy> = {
  dream: {
    screenTitle: "Record a dream",
    subtitle: "Write down a dream you want to remember. Held in your own words.",
    titleLabel: "A name for this dream",
    titlePlaceholder: "A short name for this dream…",
    contentLabel: "The dream",
    contentPlaceholder: "In your own words — what you remember of the dream…",
    contentNoun: "dream",
    occurredLabel: "When you had this dream (optional)",
    tagPlaceholder: "e.g. Family, Guidance, Peace",
    saveLabel: "Save dream",
  },
  prophecy: {
    screenTitle: "Record a prophetic word",
    subtitle:
      "Write down a word you sense you've received. Held in your own words.",
    titleLabel: "A name for this word",
    titlePlaceholder: "A short name for this word…",
    contentLabel: "The word",
    contentPlaceholder: "In your own words — the word as you received it…",
    contentNoun: "word",
    occurredLabel: "When you received this word (optional)",
    tagPlaceholder: "e.g. Calling, Hope, Provision",
    saveLabel: "Save prophecy",
  },
  instruction: {
    screenTitle: "Save an instruction",
    subtitle:
      "Record what you believe God is asking you to do. Held humbly, in your own words.",
    titleLabel: "An instruction I'm holding",
    titlePlaceholder: "A short name for this instruction…",
    contentLabel: "What I sense I'm being asked to do",
    contentPlaceholder:
      "In your own words — what you believe God is asking of you…",
    contentNoun: "details",
    occurredLabel: "",
    tagPlaceholder: "e.g. Obedience, Generosity, Step of faith",
    saveLabel: "Save instruction",
  },
};

function parseRevelationKind(value: string | undefined): RevelationKind {
  return value === "dream" || value === "prophecy" || value === "instruction"
    ? value
    : "instruction";
}

export default function NewRevelationScreen() {
  const params = useLocalSearchParams<{
    kind?: string;
    sourceJournalEntryId?: string;
  }>();
  const kind = parseRevelationKind(params.kind);
  const sourceJournalEntryId = params.sourceJournalEntryId;
  const copy = KIND_COPY[kind];
  const isInstruction = kind === "instruction";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [occurredAt, setOccurredAt] = useState<string | null>(
    toLocalDateString(new Date()),
  );
  const [saving, setSaving] = useState(false);

  const canSave =
    title.trim().length > 0 && content.trim().length > 0 && !saving;
  const { allowNextNavigation } = useUnsavedChangesGuard(
    !saving &&
      (hasTypedEntryContent([title, content]) ||
        tags.length > 0 ||
        dueAt !== null),
  );

  function handleStructured(result: StructureVoiceEntryResponse) {
    if (result.entryType !== kind) {
      return;
    }
    if (result.entryType === "instruction") {
      setTitle(result.fields.title);
      setContent(result.fields.content);
      setTags(suggestionTags(result.fields));
      // Defense-in-depth: never accept an inferred or past target date.
      setDueAt(safeFollowUpDate(result.fields.dueAt));
    } else if (
      result.entryType === "dream" ||
      result.entryType === "prophecy"
    ) {
      setTitle(result.fields.title);
      setContent(result.fields.content);
      setTags(suggestionTags(result.fields));
    }
  }

  async function handleSave() {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await createRevelation({
        kind,
        title: title.trim(),
        content: content.trim(),
        dueAt: isInstruction ? dueAt : null,
        occurredAt: isInstruction ? null : occurredAt,
        tags,
        sourceJournalEntryId: sourceJournalEntryId ?? null,
        status: "active",
        syncStatus: "local_only",
      });
      allowNextNavigation();
      router.replace({
        pathname: "/(tabs)/gratitude",
        params: { segment: isInstruction ? "instructions" : "revelations" },
      });
    } catch (error: unknown) {
      // Never log raw revelation content — only an error category.
      console.warn(
        "Failed to save revelation:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "This could not be saved just now. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <FlowScreen title={copy.screenTitle} subtitle={copy.subtitle}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {sourceJournalEntryId ? (
          <SourceReflectionLink
            journalEntryId={sourceJournalEntryId}
            pressable={false}
          />
        ) : null}

        <VoiceEntryCapture
          entryType={kind}
          entryDate={toLocalDateString(new Date())}
          onStructured={handleStructured}
          hasExistingInput={
            hasTypedEntryContent([title, content]) || tags.length > 0
          }
        />

        <PolishWithAi
          entryType={kind}
          entryDate={toLocalDateString(new Date())}
          getText={() =>
            [title, content]
              .filter((value) => value.trim().length > 0)
              .join("\n\n")
          }
          disabled={saving}
          onApplyTitle={setTitle}
          onApplyContent={setContent}
          onApplyTags={setTags}
          onApplyDate={
            isInstruction
              ? (date) => setDueAt(safeFollowUpDate(date))
              : undefined
          }
          getCurrentValues={() => ({
            title,
            content,
            tags,
            date: dueAt,
          })}
          titleNoun="name"
          contentNoun={copy.contentNoun}
          dateNoun="by-when date"
        />

        <View style={styles.field}>
          <Text style={styles.label}>{copy.titleLabel}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={copy.titlePlaceholder}
              placeholderTextColor={colors.textSubtle}
              autoFocus
              style={styles.singleLineInput}
              accessibilityLabel={`${copy.screenTitle} title`}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{copy.contentLabel}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder={copy.contentPlaceholder}
              placeholderTextColor={colors.textSubtle}
              multiline
              textAlignVertical="top"
              style={styles.contentInput}
              accessibilityLabel={`${copy.screenTitle} content`}
            />
          </View>
        </View>

        <View style={styles.field}>
          <TagEditor
            value={tags}
            onChange={setTags}
            placeholder={copy.tagPlaceholder}
          />
        </View>

        {!isInstruction ? (
          <DateSelector
            label={copy.occurredLabel}
            value={occurredAt}
            onChange={setOccurredAt}
            maxDate={toLocalDateString(new Date())}
            allowClear
            emptyLabel="No date"
            hint="The day it came to you. Today or a past day."
          />
        ) : null}

        {isInstruction ? (
          <DateSelector
            label="By when (optional)"
            value={dueAt}
            onChange={setDueAt}
            disablePast
            allowClear
            emptyLabel="No target date"
            hint="If you sense a timeframe, set a gentle day to aim for. Today or later."
          />
        ) : null}

        <Text style={styles.hint}>Saved privately on this device only.</Text>
        <Button
          label={copy.saveLabel}
          onPress={handleSave}
          disabled={!canSave}
          loading={saving}
        />
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.cardTitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  contentInput: {
    ...typography.body,
    color: colors.text,
    minHeight: 120,
  },
  singleLineInput: {
    ...typography.body,
    color: colors.text,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
});
