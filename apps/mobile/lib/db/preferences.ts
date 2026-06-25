import * as Crypto from "expo-crypto";
import { getDatabase } from "./client";

/**
 * Device-local key/value preferences. These are intentionally NOT cloud-synced
 * and NOT included in data exports. Values are small, non-sensitive flags plus
 * the anonymous AI install ID (see below).
 */
type PreferenceKey =
  | "aiReflectionConsentAcknowledged"
  | "voiceTranscriptionConsentAcknowledged"
  | "voiceEntryConsentAcknowledged"
  | "aiTextPolishConsentAcknowledged"
  | "autoAiReflectionEnabled"
  | "aiInstallId";

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

const AI_TEXT_POLISH_CONSENT_KEY: PreferenceKey =
  "aiTextPolishConsentAcknowledged";

/**
 * True once the user has acknowledged the "Polish with AI" privacy notice
 * (sending the text they typed to Graceward to clean it up and suggest a
 * title/tags). Tracked separately from the voice-entry consent because no
 * recording is involved — only the typed text is sent.
 */
export async function hasAcknowledgedAiTextPolishConsent(): Promise<boolean> {
  return (await getPreference(AI_TEXT_POLISH_CONSENT_KEY)) === "true";
}

/** Records that the user acknowledged the "Polish with AI" privacy notice. */
export async function acknowledgeAiTextPolishConsent(): Promise<void> {
  await setPreference(AI_TEXT_POLISH_CONSENT_KEY, "true");
}

/** Clears the acknowledgement so the polish notice shows again. */
export async function resetAiTextPolishConsent(): Promise<void> {
  await clearPreference(AI_TEXT_POLISH_CONSENT_KEY);
}

const AUTO_AI_REFLECTION_KEY: PreferenceKey = "autoAiReflectionEnabled";

/**
 * Whether AI reflection runs automatically after an eligible reflection is
 * saved. Defaults to false: a reflection's text never leaves the device for AI
 * analysis unless the user taps "Reflect with Graceward", or opts into this in
 * Settings. Opting in is gated behind the AI reflection consent (the toggle's
 * confirmation acknowledges it), so enabling this never bypasses consent.
 */
export async function isAutoAiReflectionEnabled(): Promise<boolean> {
  return (await getPreference(AUTO_AI_REFLECTION_KEY)) === "true";
}

/**
 * Enables or disables automatic AI reflection after saving an eligible entry.
 * Stored device-locally only; cleared by "Delete all local data".
 */
export async function setAutoAiReflectionEnabled(
  enabled: boolean,
): Promise<void> {
  await setPreference(AUTO_AI_REFLECTION_KEY, enabled ? "true" : "false");
}

const AI_INSTALL_ID_KEY: PreferenceKey = "aiInstallId";

// Standard 8-4-4-4-12 hex UUID (any version). Kept in sync with the server's
// isValidInstallId check in @graceward/ai-schemas.
const INSTALL_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns this install's anonymous AI ID, generating and persisting one on
 * first use. This is a random UUID — NOT an account, and NOT derived from any
 * device hardware or advertising identifier. It is stored locally only and sent
 * with AI requests so the server can apply per-install daily quotas (closed-beta
 * abuse/cost control). It is cleared by "Delete all local data" (the whole
 * app_preferences table is wiped), after which a fresh ID is generated next
 * time an AI action is used. A stored value that isn't UUID-shaped (corrupted)
 * is replaced.
 */
export async function getOrCreateAiInstallId(): Promise<string> {
  const existing = await getPreference(AI_INSTALL_ID_KEY);
  if (existing && INSTALL_ID_RE.test(existing.trim())) {
    return existing.trim();
  }
  const id = Crypto.randomUUID();
  await setPreference(AI_INSTALL_ID_KEY, id);
  return id;
}
