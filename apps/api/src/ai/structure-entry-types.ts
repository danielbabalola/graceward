import type {
  FaithfulnessMomentSuggestion,
  GratitudeSuggestion,
  LessonSuggestion,
  PrayerSuggestion,
} from "@graceward/ai-schemas";
import type { StructureEntryInput } from "./structure-entry-prompt.js";

/** The structured fields produced for one entry, by type. */
export type VoiceEntryFields =
  | PrayerSuggestion
  | GratitudeSuggestion
  | FaithfulnessMomentSuggestion
  | LessonSuggestion;

/**
 * Provider boundary for turning a spoken-note transcript into a single entry's
 * structured fields. Mirrors the reflection-analysis provider so the backend
 * provider can be swapped without touching the route. Implementations must
 * never let raw transcript content leak into logs.
 */
export interface EntryStructuringProvider {
  readonly name: string;
  readonly model: string;
  structure(input: StructureEntryInput): Promise<VoiceEntryFields>;
}
