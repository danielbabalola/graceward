import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { initializeDatabase } from "@/lib/db";
import { colors, spacing, typography } from "@/theme/tokens";

type DbState = "loading" | "ready" | "error";

export default function RootLayout() {
  const [dbState, setDbState] = useState<DbState>("loading");

  useEffect(() => {
    let active = true;
    initializeDatabase()
      .then(() => {
        if (active) {
          setDbState("ready");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setDbState("error");
        }
        console.warn(
          "Failed to initialize local database:",
          error instanceof Error ? error.message : "unknown error",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  if (dbState !== "ready") {
    return (
      <View style={styles.gate}>
        <StatusBar style="dark" />
        {dbState === "loading" ? (
          <ActivityIndicator color={colors.primaryDeep} />
        ) : (
          <Text style={styles.errorText}>
            Something went wrong preparing your private journal. Please restart
            the app.
          </Text>
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.backgroundCream,
  },
  errorText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});
