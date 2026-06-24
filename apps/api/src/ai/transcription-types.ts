/**
 * Audio passed to a transcription provider. The buffer holds the raw uploaded
 * audio bytes in memory only for the duration of the request — it is never
 * written to disk or logged.
 */
export type TranscriptionInput = {
  audio: Buffer;
  /** Original filename (used only to hint the container/extension to OpenAI). */
  filename: string;
  /** Validated audio content type. */
  mimeType: string;
};

export type TranscriptionResult = {
  transcript: string;
  model: string;
};

/**
 * Provider boundary for voice transcription. Keeping this behind a small
 * interface mirrors the reflection-analysis provider and lets us swap the
 * backend-only transcription service without touching the route.
 * Implementations must never log raw audio, file paths, or transcript text.
 */
export interface TranscriptionProvider {
  readonly name: string;
  readonly model: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}
