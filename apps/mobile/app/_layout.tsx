import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts,
} from "@expo-google-fonts/fraunces";
import { initializeDatabase } from "@/lib/db";
import { colors, spacing, typography } from "@/theme/tokens";

type DbState = "loading" | "ready" | "error";

export default function RootLayout() {
  const [dbState, setDbState] = useState<DbState>("loading");
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });
  // Don't let a font-loading failure trap the app on the splash gate; fall
  // back to the system font instead (headings just won't use the serif).
  const fontsReady = fontsLoaded || fontError != null;

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

  if (dbState !== "ready" || !fontsReady) {
    return (
      <View style={styles.gate}>
        <StatusBar style="dark" />
        {dbState === "error" ? (
          <Text style={styles.errorText}>
            Something went wrong preparing your private journal. Please restart
            the app.
          </Text>
        ) : (
          <ActivityIndicator color={colors.primaryDeep} />
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
