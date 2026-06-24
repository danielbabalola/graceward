import { Platform } from "react-native";
import Constants from "expo-constants";
import { API_BASE_URL } from "@/lib/api/config";
import {
  APP_NAME,
  describeApiEnvironment,
  redactApiUrl,
  type DiagnosticInfo,
} from "@/lib/diagnostics";

/**
 * Read the app version exposed by Expo. Prefers the native build's version
 * (set at build time) and falls back to the value in app.json.
 */
function readAppVersion(): string | null {
  return (
    Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null
  );
}

/**
 * Read the native build number when available (iOS buildNumber / Android
 * versionCode). Only present in real builds, not always in the dev client.
 */
function readBuildNumber(): string | null {
  if (Constants.nativeBuildVersion) {
    return Constants.nativeBuildVersion;
  }
  const iosBuild = Constants.expoConfig?.ios?.buildNumber;
  if (iosBuild) {
    return iosBuild;
  }
  const androidVersion = Constants.expoConfig?.android?.versionCode;
  return androidVersion != null ? String(androidVersion) : null;
}

function readOsVersion(): string | null {
  const version = Platform.Version;
  return version != null ? String(version) : null;
}

/**
 * Gather the safe, non-identifying diagnostic snapshot used by the Help &
 * Feedback area. Reads only app/device metadata and a redacted API host — never
 * user content, secrets, or AI output. The timestamp is captured at call time.
 */
export function getDiagnosticInfo(): DiagnosticInfo {
  return {
    appName: APP_NAME,
    appVersion: readAppVersion(),
    buildNumber: readBuildNumber(),
    platform: Platform.OS,
    osVersion: readOsVersion(),
    apiHost: redactApiUrl(API_BASE_URL),
    apiEnvironment: describeApiEnvironment(API_BASE_URL),
    timestamp: new Date().toISOString(),
  };
}
