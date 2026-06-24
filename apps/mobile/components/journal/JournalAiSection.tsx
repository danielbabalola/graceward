import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { JournalEntry } from "@graceward/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isAiResultStale } from "@/lib/api/reflection";
import { getLatestAiReflectionResult, type AiReflectionResult } from "@/lib/db";
import { spacing } from "@/theme/tokens";

type Props = {
  entry: JournalEntry;
};

function openAiReflection(entryId: string, reflectAgain = false): void {
  router.push({
    pathname: "/ai-reflection/[id]",
    params: reflectAgain
      ? { id: entryId, reflectAgain: "1" }
      : { id: entryId },
  });
}

/**
 * Renders the AI reflection lifecycle for a text journal entry: a first-run
 * entry point, a "view + reflect again" state once a result is cached, and a
 * calm "edited since" state when the entry changed after the cached result.
 *
 * Reading the cached result never sends anything; AI only runs after the user
 * taps through to the AI screen and acts there.
 */
export function JournalAiSection({ entry }: Props) {
  const [result, setResult] = useState<AiReflectionResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const cached = await getLatestAiReflectionResult(entry.id);
          if (active) {
            setResult(cached);
            setLoaded(true);
          }
        } catch (error: unknown) {
          // A read failure shouldn't block the entry; fall back to first-run.
          console.warn(
            "Failed to load cached AI reflection:",
            error instanceof Error ? error.message : "unknown error",
          );
          if (active) {
            setResult(null);
            setLoaded(true);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [entry.id]),
  );

  // Avoid flicker between first-run and result states while the cache loads.
  if (!loaded) {
    return null;
  }

  if (!result) {
    return (
      <Button
        label="Reflect with Graceward"
        variant="secondary"
        onPress={() => openAiReflection(entry.id)}
        style={styles.action}
      />
    );
  }

  const stale = isAiResultStale(entry.updatedAt, result.createdAt);

  // Current result, entry unchanged: view-only. No "Reflect again" here.
  if (!stale) {
    return (
      <View>
        <Card
          variant="primary"
          eyebrow="Graceward reflection"
          title="Graceward has reflected on this entry."
          description="You can revisit the reflection any time — nothing is sent again unless you choose to."
          style={styles.card}
        />
        <Button
          label="View Graceward reflection"
          onPress={() => openAiReflection(entry.id)}
          style={styles.action}
        />
      </View>
    );
  }

  // Entry edited after the cached result: offer viewing the previous result or
  // reflecting again on the updated entry.
  return (
    <View>
      <Card
        variant="subtle"
        eyebrow="Graceward reflection"
        title="This reflection was created before your latest edit."
        description="You can view the previous reflection or reflect again on the updated entry."
        style={styles.card}
      />
      <Button
        label="View previous reflection"
        onPress={() => openAiReflection(entry.id)}
        style={styles.action}
      />
      <Button
        label="Reflect again"
        variant="secondary"
        onPress={() => openAiReflection(entry.id, true)}
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  action: {
    marginBottom: spacing.sm,
  },
});
