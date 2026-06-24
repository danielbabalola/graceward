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
import type { PrayerRequest } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { DateSelector } from "@/components/ui/DateSelector";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { SourceReflectionLink } from "@/components/journal/SourceReflectionLink";
import {
  archivePrayerRequest,
  getPrayerRequestById,
  markPrayerRequestAnswered,
  reactivatePrayerRequest,
  softDeletePrayerRequest,
  updatePrayerRequest,
} from "@/lib/db";
import { formatPrayerDate, prayerStatusLabel } from "@/lib/prayer-display";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";
type Mode = "view" | "editing" | "answering";

export default function PrayerRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [request, setRequest] = useState<PrayerRequest | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [mode, setMode] = useState<Mode>("view");

  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");

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
          const result = await getPrayerRequestById(id);
          if (!active) {
            return;
          }
          if (!result) {
            setLoadState("not-found");
            return;
          }
          setRequest(result);
          setLoadState("ready");
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load prayer request:",
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
    if (!request) {
      return;
    }
    setTitleDraft(request.title);
    setDescriptionDraft(request.description ?? "");
    setFollowUpDraft(request.followUpAt ?? null);
    setMode("editing");
  }

  function startAnswering() {
    setAnswerDraft("");
    setMode("answering");
  }

  function cancelMode() {
    setMode("view");
  }

  const trimmedTitle = titleDraft.trim();
  const canSaveEdit = trimmedTitle.length > 0 && !saving;

  async function handleSaveEdit() {
    if (!request || !canSaveEdit) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePrayerRequest(request.id, {
        title: trimmedTitle,
        description:
          descriptionDraft.trim().length > 0 ? descriptionDraft.trim() : null,
        followUpAt: followUpDraft,
      });
      if (updated) {
        setRequest(updated);
      }
      setMode("view");
    } catch (error: unknown) {
      console.warn(
        "Failed to update prayer request:",
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

  async function handleMarkAnswered() {
    if (!request || saving) {
      return;
    }
    setSaving(true);
    try {
      const answer = answerDraft.trim();
      const updated = await markPrayerRequestAnswered(
        request.id,
        answer.length > 0 ? answer : null,
      );
      if (updated) {
        setRequest(updated);
      }
      setMode("view");
    } catch (error: unknown) {
      console.warn(
        "Failed to mark prayer request answered:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not update",
        "This request could not be marked answered just now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmArchive() {
    if (!request) {
      return;
    }
    Alert.alert(
      "Archive this request?",
      "It will move to Archived and out of your active focus. You can still find it there.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () => {
            void handleArchive();
          },
        },
      ],
    );
  }

  async function handleArchive() {
    if (!request || saving) {
      return;
    }
    setSaving(true);
    try {
      const updated = await archivePrayerRequest(request.id);
      if (updated) {
        setRequest(updated);
      }
    } catch (error: unknown) {
      console.warn(
        "Failed to archive prayer request:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not archive",
        "This request could not be archived just now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmReactivate() {
    if (!request) {
      return;
    }
    const message =
      request.status === "answered"
        ? "This will move it back to Active. Any saved answer note will be cleared."
        : "This will move it back to Active so you can keep praying about it.";
    Alert.alert("Move back to Active?", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Move to Active",
        onPress: () => {
          void handleReactivate();
        },
      },
    ]);
  }

  async function handleReactivate() {
    if (!request || saving) {
      return;
    }
    setSaving(true);
    try {
      const updated = await reactivatePrayerRequest(request.id);
      if (updated) {
        setRequest(updated);
      }
    } catch (error: unknown) {
      console.warn(
        "Failed to reactivate prayer request:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not update",
        "This request could not be moved to Active just now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!request) {
      return;
    }
    Alert.alert(
      "Delete this request?",
      "This prayer request will be removed from your device.",
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
    if (!request || deleting) {
      return;
    }
    setDeleting(true);
    try {
      await softDeletePrayerRequest(request.id);
      router.replace("/(tabs)/prayer");
    } catch (error: unknown) {
      console.warn(
        "Failed to delete prayer request:",
        error instanceof Error ? error.message : "unknown error",
      );
      Alert.alert(
        "Could not delete",
        "This request could not be removed just now. Please try again.",
      );
      setDeleting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title="Prayer request">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title="Prayer request">
        <Text style={styles.stateText}>
          This prayer request could not be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !request) {
    return (
      <FlowScreen title="Prayer request">
        <Text style={styles.stateText}>
          This prayer request is no longer available.
        </Text>
      </FlowScreen>
    );
  }

  if (mode === "editing") {
    return (
      <FlowScreen title="Edit prayer request">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="What are you praying for?"
                placeholderTextColor={colors.textSubtle}
                style={styles.titleInput}
                accessibilityLabel="Prayer request title"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Details (optional)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={descriptionDraft}
                onChangeText={setDescriptionDraft}
                placeholder="Anything more you'd like to remember…"
                placeholderTextColor={colors.textSubtle}
                multiline
                textAlignVertical="top"
                style={styles.descriptionInput}
                accessibilityLabel="Prayer request details"
              />
            </View>
          </View>

          <DateSelector
            label="Follow-up date (optional)"
            value={followUpDraft}
            onChange={setFollowUpDraft}
            disablePast
            allowClear
            emptyLabel="No follow-up date"
            hint="Choose when you'd like to revisit this. Today or a future day."
          />

          <Button
            label="Save changes"
            onPress={handleSaveEdit}
            disabled={!canSaveEdit}
            loading={saving}
            style={styles.action}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={cancelMode}
            disabled={saving}
            style={styles.action}
          />
        </KeyboardAvoidingView>
      </FlowScreen>
    );
  }

  if (mode === "answering") {
    return (
      <FlowScreen
        title="Mark as answered"
        subtitle="Take a moment to remember how God met you here."
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.field}>
            <Text style={styles.label}>How was it answered? (optional)</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={answerDraft}
                onChangeText={setAnswerDraft}
                placeholder="What happened, or how you saw God move…"
                placeholderTextColor={colors.textSubtle}
                multiline
                textAlignVertical="top"
                autoFocus
                style={styles.descriptionInput}
                accessibilityLabel="Answer description"
              />
            </View>
          </View>

          <Button
            label="Mark as answered"
            onPress={handleMarkAnswered}
            loading={saving}
            style={styles.action}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={cancelMode}
            disabled={saving}
            style={styles.action}
          />
        </KeyboardAvoidingView>
      </FlowScreen>
    );
  }

  const followUpLabel = formatPrayerDate(request.followUpAt);
  const answeredLabel = formatPrayerDate(request.answeredAt);

  return (
    <FlowScreen title={request.title} subtitle={prayerStatusLabel(request.status)}>
      <View style={styles.bodyCard}>
        <Text style={styles.sectionLabel}>Details</Text>
        <Text style={styles.body}>
          {request.description?.trim()
            ? request.description
            : "No details added."}
        </Text>
      </View>

      {request.status === "active" && followUpLabel ? (
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>Follow-up</Text>
          <Text style={styles.body}>{followUpLabel}</Text>
        </View>
      ) : null}

      {request.status === "answered" ? (
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>
            {answeredLabel ? `Answered · ${answeredLabel}` : "Answered"}
          </Text>
          <Text style={styles.body}>
            {request.answerDescription?.trim()
              ? request.answerDescription
              : "No answer details noted."}
          </Text>
        </View>
      ) : null}

      {request.sourceJournalEntryId ? (
        <SourceReflectionLink journalEntryId={request.sourceJournalEntryId} />
      ) : null}

      <Text style={styles.privacyLine}>Private to this device.</Text>

      <Button label="Edit" onPress={startEditing} style={styles.action} />
      {request.status === "active" ? (
        <Button
          label="Mark as answered"
          variant="secondary"
          onPress={startAnswering}
          style={styles.action}
        />
      ) : null}
      {request.status !== "active" ? (
        <Button
          label="Move back to Active"
          variant="secondary"
          onPress={confirmReactivate}
          disabled={saving}
          style={styles.action}
        />
      ) : null}
      {request.status !== "archived" ? (
        <Button
          label="Archive"
          variant="secondary"
          onPress={confirmArchive}
          disabled={saving}
          style={styles.action}
        />
      ) : null}
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
  infoCard: {
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
  titleInput: {
    ...typography.body,
    color: colors.text,
  },
  descriptionInput: {
    ...typography.body,
    color: colors.text,
    minHeight: 120,
  },
  errorHint: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
    marginTop: spacing.sm,
  },
  action: {
    marginBottom: spacing.sm,
  },
});
