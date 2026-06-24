import { AI_ACCESS_MESSAGES, INSTALL_ID_HEADER } from "./ai-access-messages";

export { AI_ACCESS_MESSAGES, INSTALL_ID_HEADER };

/**
 * Builds the install-ID header for an AI request, generating/persisting the
 * anonymous ID on first use. Returns an empty object on failure so a request can
 * still proceed (the server then responds with a calm INSTALL_ID_REQUIRED that
 * the caller maps to friendly copy) rather than throwing before the call.
 *
 * The DB module is imported lazily so this module (and the AI clients that
 * import it) stay free of Expo/SQLite at load time — keeping pure-helper unit
 * tests importable without pulling in react-native.
 */
export async function buildInstallIdHeader(): Promise<Record<string, string>> {
  try {
    const { getOrCreateAiInstallId } = await import("@/lib/db");
    const installId = await getOrCreateAiInstallId();
    return { [INSTALL_ID_HEADER]: installId };
  } catch {
    return {};
  }
}
