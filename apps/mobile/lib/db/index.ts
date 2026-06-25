export { getDatabase, initializeDatabase } from "./client";
export { runMigrations } from "./migrations";
export {
  createJournalEntry,
  listJournalEntries,
  getMostRecentJournalEntry,
  listJournalEntriesByDate,
  listJournalEntryDatesForMonth,
  getJournalEntryById,
  updateJournalEntry,
  saveVoiceTranscript,
  softDeleteJournalEntry,
  getJournalEntryTagNames,
  setJournalEntryTags,
} from "./journal";
export type { UpdateJournalEntryInput } from "./journal";
export {
  createAudioAsset,
  getAudioAssetByEntryId,
  listAudioAssetsForExport,
  updateAudioTranscriptionStatus,
  softDeleteAudioAssetsForEntry,
} from "./audio";
export { listAllForExport, deleteAllLocalData } from "./data-management";
export type { LocalDataExport } from "./data-management";
export {
  createAiReflectionResult,
  getLatestAiReflectionResult,
} from "./ai-results";
export type {
  AiReflectionResult,
  CreateAiReflectionResultInput,
} from "./ai-results";
export {
  markAiSuggestionSaved,
  listSavedSuggestionFingerprints,
  listSavedSuggestionsForExport,
  prayerSuggestionFingerprint,
  gratitudeSuggestionFingerprint,
  faithfulnessSuggestionFingerprint,
  lessonSuggestionFingerprint,
  instructionSuggestionFingerprint,
} from "./ai-saved-suggestions";
export type {
  SuggestionKind,
  CreatedItemType,
  MarkAiSuggestionSavedInput,
  SavedSuggestionExport,
} from "./ai-saved-suggestions";
export {
  createPrayerRequest,
  listPrayerRequests,
  listPrayerRequestsByStatus,
  listPrayerRequestsBySourceJournalEntryId,
  getPrayerFocus,
  getMostRecentAnsweredPrayer,
  getPrayerRequestById,
  updatePrayerRequest,
  markPrayerRequestAnswered,
  archivePrayerRequest,
  reactivatePrayerRequest,
  softDeletePrayerRequest,
  getPrayerRequestTagNames,
} from "./prayer";
export {
  createGratitude,
  listGratitudes,
  listRecentGratitudes,
  listGratitudesByJournalEntryId,
  getMostRecentGratitude,
  getGratitudeById,
  updateGratitude,
  softDeleteGratitude,
  getGratitudeTagNames,
} from "./gratitude";
export {
  createWin,
  listWins,
  listRecentWins,
  listWinsByJournalEntryId,
  getMostRecentWin,
  getWinById,
  updateWin,
  softDeleteWin,
  getWinTagNames,
} from "./wins";
export {
  createLesson,
  listLessons,
  listRecentLessons,
  listLessonsByStatus,
  getMostRecentLesson,
  getLessonById,
  updateLesson,
  archiveLesson,
  reactivateLesson,
  softDeleteLesson,
  getLessonTagNames,
} from "./lessons";
export {
  createRevelation,
  listRevelations,
  listRevelationsByKind,
  getInstructionFocus,
  getRevelationById,
  updateRevelation,
  fulfillRevelation,
  reopenRevelation,
  softDeleteRevelation,
  getRevelationTagNames,
} from "./revelations";
export {
  hasAcknowledgedAiReflectionConsent,
  acknowledgeAiReflectionConsent,
  resetAiReflectionConsent,
  hasAcknowledgedVoiceTranscriptionConsent,
  acknowledgeVoiceTranscriptionConsent,
  resetVoiceTranscriptionConsent,
  hasAcknowledgedVoiceEntryConsent,
  acknowledgeVoiceEntryConsent,
  resetVoiceEntryConsent,
  hasAcknowledgedAiTextPolishConsent,
  acknowledgeAiTextPolishConsent,
  resetAiTextPolishConsent,
  getOrCreateAiInstallId,
} from "./preferences";
export {
  normalizeTagSlug,
  normalizeTagName,
  dedupeTagNames,
  sameTagNameSet,
  listAllTags,
  listTagsWithCounts,
  getTagById,
  upsertTagByName,
  listTagsForEntry,
  listTagsForEntries,
  listEntryRefsForTag,
  listEntryIdsForTagByType,
  listEntryTagsForExport,
  setEntryTags,
  clearEntryTags,
} from "./tags";
export type { EntryTagLinkExport } from "./tags";
export { deriveTitle, isFutureLocalDate, toLocalDateString } from "./helpers";
