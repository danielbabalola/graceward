import { getDatabase } from "./client";

/**
 * Device-local key/value preferences. These are intentionally NOT cloud-synced
 * and NOT included in data exports. Values are small, non-sensitive flags only.
 */
type PreferenceKey =
  | "aiReflectionConsentAcknowledged"
  | "voiceTranscriptionConsentAcknowledged"
  | "voiceEntryConsentAcknowledged";

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

const VOICE_TRANSCRIPTION_CONSENT_KEY: PreferenceKey =
  "voiceTranscriptionConsentAcknowledged";

/**
 * True once the user has acknowledged the voice transcription privacy notice.
 * Tracked separately from the AI reflection consent so each upload type is
 * consented to on its own terms.
 */
export async function hasAcknowledgedVoiceTranscriptionConsent(): Promise<boolean> {
  return (await getPreference(VOICE_TRANSCRIPTION_CONSENT_KEY)) === "true";
}

/** Records that the user acknowledged the voice transcription privacy notice. */
export async function acknowledgeVoiceTranscriptionConsent(): Promise<void> {
  await setPreference(VOICE_TRANSCRIPTION_CONSENT_KEY, "true");
}

/** Clears the acknowledgement so the transcription notice shows again. */
export async function resetVoiceTranscriptionConsent(): Promise<void> {
  await clearPreference(VOICE_TRANSCRIPTION_CONSENT_KEY);
}

const VOICE_ENTRY_CONSENT_KEY: PreferenceKey = "voiceEntryConsentAcknowledged";

/**
 * True once the user has acknowledged the voice-entry privacy notice (speaking
 * a prayer/gratitude/faithfulness/lesson to create it). Tracked separately from
 * the journal transcription consent because this upload both transcribes and
 * organizes the recording into a structured entry.
 */
export async function hasAcknowledgedVoiceEntryConsent(): Promise<boolean> {
  return (await getPreference(VOICE_ENTRY_CONSENT_KEY)) === "true";
}

/** Records that the user acknowledged the voice-entry privacy notice. */
export async function acknowledgeVoiceEntryConsent(): Promise<void> {
  await setPreference(VOICE_ENTRY_CONSENT_KEY, "true");
}

/** Clears the acknowledgement so the voice-entry notice shows again. */
export async function resetVoiceEntryConsent(): Promise<void> {
  await clearPreference(VOICE_ENTRY_CONSENT_KEY);
}
