import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import type { JournalEntry } from "@graceward/shared";
import type { AnalyzeReflectionResponse } from "@graceward/ai-schemas";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FlowScreen } from "@/components/reflection/FlowScreen";
import { AiReflectionResultView } from "@/components/ai/AiReflectionResultView";
import {
  acknowledgeAiReflectionConsent,
  createAiReflectionResult,
  getJournalEntryById,
  getLatestAiReflectionResult,
  hasAcknowledgedAiReflectionConsent,
} from "@/lib/db";
import {
  analyzeReflection,
  buildAnalyzeRequest,
  canAnalyzeEntry,
  ReflectionApiError,
} from "@/lib/api/reflection";
import {
  formatEntryDate,
  inputTypeLabel,
  modeLabel,
} from "@/lib/journal-display";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type LoadState = "loading" | "ready" | "error" | "not-found";
type AnalysisState = "idle" | "analyzing" | "error";

const PRIVACY_BODY =
  "This sends this reflection's text to Graceward's AI service for analysis. Nothing is sent unless you choose this.";

export default function AiReflectionScreen() {
  const { id, reflectAgain } = useLocalSearchParams<{
    id: string;
    reflectAgain?: string;
  }>();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [result, setResult] = useState<AnalyzeReflectionResponse | null>(null);
  // ISO timestamp of the currently displayed result, used to detect whether the
  // entry was edited after this result was created.
  const [resultCreatedAt, setResultCreatedAt] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // True while an auto "Reflect again" is pending/starting, so we show a loader
  // instead of briefly flashing the previous (stale) result.
  const [autoReflecting, setAutoReflecting] = useState(reflectAgain === "1");
  // Guards the one-time auto "Reflect again" triggered from journal detail.
  const autoReflectHandledRef = useRef(false);

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
          const loadedEntry = await getJournalEntryById(id);
          if (!active) {
            return;
          }
          if (!loadedEntry) {
            setLoadState("not-found");
            return;
          }
          setEntry(loadedEntry);
          // Revisit a cached result without re-sending anything.
          const cached = await getLatestAiReflectionResult(id);
          if (active) {
            if (cached && !result) {
              setResult(cached.result);
              setResultCreatedAt(cached.createdAt);
            }
            setLoadState("ready");
          }
        } catch (error: unknown) {
          if (active) {
            setLoadState("error");
          }
          console.warn(
            "Failed to load AI reflection screen:",
            error instanceof Error ? error.message : "unknown error",
          );
        }
      })();

      return () => {
        active = false;
      };
    }, [id, result]),
  );

  function showConsentNotice() {
    Alert.alert("Reflect with Graceward?", PRIVACY_BODY, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: () => {
          void (async () => {
            // Only remember consent once the user chooses to continue. Cancel
            // leaves no preference behind, so the notice shows again next time.
            await acknowledgeAiReflectionConsent();
            await handleAnalyze();
          })();
        },
      },
    ]);
  }

  function startAnalysis() {
    if (!entry || analysisState === "analyzing") {
      return;
    }
    void (async () => {
      // After the first acknowledgement, skip the notice and analyze directly.
      const acknowledged = await hasAcknowledgedAiReflectionConsent();
      if (acknowledged) {
        await handleAnalyze();
      } else {
        // Drop the loader so the consent notice isn't shown over a spinner.
        setAutoReflecting(false);
        showConsentNotice();
      }
    })();
  }

  // "Reflect again" from journal detail arrives with reflectAgain=1. Treat it as
  // an explicit user action: run the same consent-gated flow exactly once.
  useEffect(() => {
    if (
      reflectAgain !== "1" ||
      loadState !== "ready" ||
      !entry ||
      autoReflectHandledRef.current
    ) {
      return;
    }
    autoReflectHandledRef.current = true;
    setAutoReflecting(true);
    startAnalysis();
    // startAnalysis is stable for this purpose; only re-evaluate on these inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reflectAgain, loadState, entry]);

  async function handleAnalyze() {
    if (!entry || analysisState === "analyzing") {
      return;
    }
    // From here the "analyzing" state drives the loader; release the auto flag.
    setAutoReflecting(false);
    const request = buildAnalyzeRequest(entry);
    if (!request) {
      setAnalysisError("This reflection can't be analyzed.");
      setAnalysisState("error");
      return;
    }

    setAnalysisError(null);
    setAnalysisState("analyzing");
    try {
      const analysis = await analyzeReflection(request);
      const saved = await createAiReflectionResult({
        journalEntryId: request.journalEntryId,
        result: analysis,
      });
      setResult(analysis);
      setResultCreatedAt(saved.createdAt);
      setAnalysisState("idle");
    } catch (error: unknown) {
      const message =
        error instanceof ReflectionApiError
          ? error.message
          : "Something went wrong. Please try again.";
      setAnalysisError(message);
      setAnalysisState("error");
    }
  }

  if (loadState === "loading") {
    return (
      <FlowScreen title="Reflect with Graceward">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
        </View>
      </FlowScreen>
    );
  }

  if (loadState === "error") {
    return (
      <FlowScreen title="Reflect with Graceward">
        <Text style={styles.stateText}>
          This couldn&apos;t be loaded. Please try again in a moment.
        </Text>
      </FlowScreen>
    );
  }

  if (loadState === "not-found" || !entry) {
    return (
      <FlowScreen title="Reflect with Graceward">
        <Text style={styles.stateText}>
          This reflection is no longer available.
        </Text>
      </FlowScreen>
    );
  }

  const metaLine = `${formatEntryDate(entry.entryDate)} · ${modeLabel(
    entry.mode,
  )} · ${inputTypeLabel(entry.inputType)}`;

  // While analyzing (including an auto "Reflect again"), show a loader rather
  // than the previous result, so the screen settles only once it's ready.
  if (analysisState === "analyzing" || autoReflecting) {
    return (
      <FlowScreen title="Reflect with Graceward" subtitle={metaLine}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primaryDeep} />
          <Text style={styles.loadingHint}>
            Reflecting… this stays between your device and Graceward&apos;s AI.
          </Text>
        </View>
      </FlowScreen>
    );
  }

  if (!canAnalyzeEntry(entry)) {
    return (
      <FlowScreen title="Reflect with Graceward" subtitle={metaLine}>
        <Card
          variant="subtle"
          title={
            entry.inputType === "voice"
              ? "Not available for voice yet"
              : "Not available for this reflection"
          }
          description={
            entry.inputType === "voice"
              ? "AI reflection will be available after transcription is added."
              : "AI reflection is available for text reflections."
          }
        />
      </FlowScreen>
    );
  }

  if (result) {
    // Only offer re-running when the entry was edited after this result. A
    // current result is view-only — nothing is re-sent automatically.
    const resultIsStale =
      resultCreatedAt !== null &&
      new Date(entry.updatedAt).getTime() > new Date(resultCreatedAt).getTime();
    return (
      <FlowScreen title="Reflect with Graceward" subtitle={metaLine}>
        {resultIsStale ? (
          <Text style={styles.staleNote}>
            This reflection was created before your latest edit.
          </Text>
        ) : null}
        <AiReflectionResultView journalEntryId={entry.id} result={result} />
        {resultIsStale ? (
          <Button
            label="Reflect again"
            variant="secondary"
            onPress={startAnalysis}
            style={styles.reflectAgain}
          />
        ) : null}
        {analysisState === "error" && analysisError ? (
          <Text style={styles.errorText}>{analysisError}</Text>
        ) : null}
      </FlowScreen>
    );
  }

  return (
    <FlowScreen title="Reflect with Graceward" subtitle={metaLine}>
      <Card
        variant="primary"
        eyebrow="A reflection to consider"
        title="Let Graceward reflect with you"
        description="Graceward will gently read this reflection and offer a short pastoral reflection plus optional prayers, gratitudes, faithfulness moments, and questions. You choose what, if anything, to save."
      />
      <Text style={styles.privacyNote}>{PRIVACY_BODY}</Text>
      <Button
        label="Reflect with Graceward"
        onPress={startAnalysis}
        style={styles.action}
      />
      {analysisState === "error" && analysisError ? (
        <Text style={styles.errorText}>{analysisError}</Text>
      ) : null}
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
  privacyNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  action: {
    marginBottom: spacing.sm,
  },
  reflectAgain: {
    marginTop: spacing.lg,
  },
  staleNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  loadingHint: {
    ...typography.bodySmall,
    color: colors.textSubtle,
    marginTop: spacing.md,
    textAlign: "center",
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.correctionAccent,
    marginTop: spacing.sm,
  },
});
