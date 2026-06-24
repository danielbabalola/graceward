import { getDatabase } from "./client";

/**
 * Device-local key/value preferences. These are intentionally NOT cloud-synced
 * and NOT included in data exports. Values are small, non-sensitive flags only.
 */
type PreferenceKey = "aiReflectionConsentAcknowledged";

type PreferenceRow = {
  value: string;
};

async function getPreference(key: PreferenceKey): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PreferenceRow>(
    "SELECT value FROM app_preferences WHERE key = ?",
    [key],
  );
  return row?.value ?? null;
}

async function setPreference(
  key: PreferenceKey,
  value: string,
): Promise<void> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO app_preferences (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, nowIso],
  );
}

async function clearPreference(key: PreferenceKey): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM app_preferences WHERE key = ?", [key]);
}

const AI_REFLECTION_CONSENT_KEY: PreferenceKey =
  "aiReflectionConsentAcknowledged";

/** True once the user has acknowledged the AI reflection privacy notice. */
export async function hasAcknowledgedAiReflectionConsent(): Promise<boolean> {
  return (await getPreference(AI_REFLECTION_CONSENT_KEY)) === "true";
}

/** Records that the user acknowledged the AI reflection privacy notice. */
export async function acknowledgeAiReflectionConsent(): Promise<void> {
  await setPreference(AI_REFLECTION_CONSENT_KEY, "true");
}

/** Clears the acknowledgement so the privacy notice is shown again next time. */
export async function resetAiReflectionConsent(): Promise<void> {
  await clearPreference(AI_REFLECTION_CONSENT_KEY);
}
