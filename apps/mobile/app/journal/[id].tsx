import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import type { AudioAsset, JournalEntry } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { GuidedPromptEditor } from "@/components/reflection/GuidedPromptEditor";
import { AudioPlayback } from "@/components/journal/AudioPlayback";
import {
  getAudioAssetByEntryId,
  getJournalEntryById,
  softDeleteJournalEntry,
  updateJournalEntry,
} from "@/lib/db";
import { localFileExists } from "@/lib/audio-storage";
import {
  formatEntryDate,
  inputTypeLabel,
  modeLabel,
  statusLabel,
  syncStatusLabel,
} from "@/lib/journal-display";
import {
  buildGuidedTextPayload,
  compileGuidedReflectionFromPayload,
  configForPayload,
  parseStructuredPayload,
  payloadToAnswers,
  type GuidedStructuredPayload,
  type GuidedTextPayload,
  type GuidedVoicePayload,
} from "@/lib/guided-payload";
import {
  deriveGuidedTitle,
  type GuidedAnswers,
} from "@/lib/reflection-flow";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";

export default function JournalEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [audioAsset, setAudioAsset] = useState<AudioAsset | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const [editing, setEditing] = useState(false);
  const [structuredEditing, setStructuredEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!id) {
        setLoadState("not-found");
        return;
      }
      setLoadState((prev) => (prev === "ready" ? prev : "loading"));

      (async () => {
        try {
          const result = await getJournalEntryById(id);
          if (!active) {
            return;
          }
          if (!result) {
            setLoadState("not-found");
            return;
          }
          setEntry(result);
          if (result.inputType === "voice") {
            const asset = await getAudioAssetByEntryId(result.id);
            if (active) {
              setAudioAsset(asset);
            }
          }
          if (active) {
            setLoadState("ready");
          }
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load reflection:",
            error instanceof Error ? error.message : "unknown error",
          );
        }
      })();

      return () => {
        active = false;
      };
    }, [id]),
  );

  function startEditing() {
    if (!entry) {
      return;
    }
    setDraft(entry.rawText ?? "");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraft("");
  }

  async function handleSave() {
    const trimmed = draft.trim();
    if (!entry || trimmed.length === 0 || saving) {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateJournalEntry(entry.id, { rawText: trimmed });
      if (updated) {
        setEntry(updated);
      }
      setEditing(false);
      setDraft("");
    } catch (error: unknown) {
      console.warn(
        "Failed to update reflection:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not save",
        "Your changes could not be saved just now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStructuredSave(
    payload: GuidedTextPayload,
    answers: GuidedAnswers,
  ) {
    if (!entry) {
      return;
    }
    const config = configForPayload(payload);
    const nextPayload = buildGuidedTextPayload(config, answers);
    const updated = await updateJournalEntry(entry.id, {
      rawText: compileGuidedReflectionFromPayload(nextPayload),
      title: deriveGuidedTitle(config, answers),
      structuredPayloadJson: JSON.stringify(nextPayload),
    });
    if (updated) {
      setEntry(updated);
    }
    setStructuredEditing(false);
  }

  function confirmDelete() {
    if (!entry) {
      return;
    }
    Alert.alert(
      "Delete reflection?",
      "This reflection will be removed from your journal.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDelete();
          },
        },
      ],
    );
  }

  async function handleDelete() {
    if (!entry || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await softDeleteJournalEntry(entry.id);
      router.back();
    } catch (error: unknown) {
      console.warn(
        "Failed to delete reflection:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not delete",
        "This reflection could not be removed just now. Please try again.",
      );
      setDeleting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title="Reflection">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title="Reflection">
        <Text style={styles.stateText}>
          This reflection could not be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !entry) {
    return (
      <FlowScreen title="Reflection">
        <Text style={styles.stateText}>
          This reflection is no longer available.
        </Text>
      </FlowScreen>
    );
  }

  const payload: GuidedStructuredPayload | null = parseStructuredPayload(
    entry.structuredPayloadJson,
  );
  const guidedTextPayload: GuidedTextPayload | null =
    payload && payload.inputType === "text" ? payload : null;
  const guidedVoicePayload: GuidedVoicePayload | null =
    payload && payload.inputType === "voice" ? payload : null;

  const metaLine = `${formatEntryDate(entry.entryDate)} · ${modeLabel(
    entry.mode,
  )} · ${inputTypeLabel(entry.inputType)}`;

  if (entry.inputType === "voice") {
    const audioAvailable =
      audioAsset !== null && localFileExists(audioAsset.localFilePath);

    return (
      <FlowScreen title={entry.title ?? "Voice reflection"} subtitle={metaLine}>
        {guidedVoicePayload && guidedVoicePayload.prompts.length > 0 ? (
          <View style={styles.promptsCard}>
            <Text style={styles.sectionLabel}>Prompts in this reflection</Text>
            {guidedVoicePayload.prompts.map((prompt) => (
              <View key={prompt.id} style={styles.promptRow}>
                <Text style={styles.promptBullet}>·</Text>
                <Text style={styles.promptText}>{prompt.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.audioWrapper}>
          {audioAvailable ? (
            <AudioPlayback
              key={audioAsset.localFilePath}
              uri={audioAsset.localFilePath}
              fallbackDurationSeconds={audioAsset.durationSeconds}
            />
          ) : (
            <View style={styles.bodyCard}>
              <Text style={styles.body}>
                This audio is no longer available on this device.
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.privacyLine}>
          Audio is stored privately on this device. Transcription isn't
          available yet.
        </Text>
        <Text style={styles.privacyLine}>
          {statusLabel(entry.status)} · {syncStatusLabel(entry.syncStatus)}
        </Text>
        <Button
          label="Delete"
          variant="destructive"
          onPress={confirmDelete}
          loading={deleting}
          style={styles.action}
        />
      </FlowScreen>
    );
  }

  // Structured guided text entry: edit via the one-prompt-at-a-time editor.
  if (guidedTextPayload && structuredEditing) {
    const config = configForPayload(guidedTextPayload);
    return (
      <FlowScreen title={config.title} subtitle="Edit your reflection">
        <GuidedPromptEditor
          config={config}
          initialAnswers={payloadToAnswers(guidedTextPayload)}
          saveLabel="Save changes"
          onSave={(answers) => handleStructuredSave(guidedTextPayload, answers)}
          onCancel={() => setStructuredEditing(false)}
        />
      </FlowScreen>
    );
  }

  if (guidedTextPayload) {
    const answered = guidedTextPayload.prompts.filter(
      (prompt) => prompt.answer.trim().length > 0,
    );
    return (
      <FlowScreen title={entry.title ?? "Reflection"} subtitle={metaLine}>
        {answered.length > 0 ? (
          answered.map((prompt) => (
            <View key={prompt.id} style={styles.bodyCard}>
              <Text style={styles.sectionLabel}>{prompt.label}</Text>
              <Text style={styles.body}>{prompt.answer}</Text>
            </View>
          ))
        ) : (
          <View style={styles.bodyCard}>
            <Text style={styles.body}>No answers recorded yet.</Text>
          </View>
        )}
        <Text style={styles.privacyLine}>
          {statusLabel(entry.status)} · {syncStatusLabel(entry.syncStatus)}
        </Text>
        <Button
          label="Edit"
          onPress={() => setStructuredEditing(true)}
          style={styles.action}
        />
        <Button
          label="Delete"
          variant="destructive"
          onPress={confirmDelete}
          loading={deleting}
          style={styles.action}
        />
      </FlowScreen>
    );
  }

  // Legacy / Free Flow text entry: raw_text editing.
  return (
    <FlowScreen title={entry.title ?? "Reflection"} subtitle={metaLine}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {editing ? (
          <>
            <View style={styles.editorWrapper}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="What's on your heart today?"
                placeholderTextColor={colors.textSubtle}
                multiline
                autoFocus
                textAlignVertical="top"
                style={styles.input}
                accessibilityLabel="Reflection text"
              />
            </View>
            <Button
              label="Save changes"
              onPress={handleSave}
              disabled={draft.trim().length === 0}
              loading={saving}
              style={styles.action}
            />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={cancelEditing}
              disabled={saving}
              style={styles.action}
            />
          </>
        ) : (
          <>
            <View style={styles.bodyCard}>
              <Text style={styles.body}>{entry.rawText}</Text>
            </View>
            <Text style={styles.privacyLine}>
              {statusLabel(entry.status)} · {syncStatusLabel(entry.syncStatus)}
            </Text>
            <Button label="Edit" onPress={startEditing} style={styles.action} />
            <Button
              label="Delete"
              variant="destructive"
              onPress={confirmDelete}
              loading={deleting}
              style={styles.action}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  stateText: {
    ...typography.body,
    color: colors.textMuted,
  },
  bodyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  body: {
    ...typography.body,
    color: colors.text,
  },
  privacyLine: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginBottom: spacing.lg,
  },
  promptsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  promptRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  promptBullet: {
    ...typography.body,
    color: colors.textSubtle,
  },
  promptText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  editorWrapper: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: 220,
  },
  action: {
    marginBottom: spacing.sm,
  },
  audioWrapper: {
    marginBottom: spacing.md,
  },
});
