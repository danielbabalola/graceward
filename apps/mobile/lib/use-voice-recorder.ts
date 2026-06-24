import { useCallback, useEffect, useState } from "react";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { deleteLocalFile } from "@/lib/audio-storage";

export type VoiceRecorderStatus =
  | "idle"
  | "requesting"
  | "denied"
  | "recording"
  | "preview"
  | "saving"
  | "error";

export const MAX_RECORDING_SECONDS = 15 * 60;

export type VoiceRecorder = {
  status: VoiceRecorderStatus;
  setStatus: (status: VoiceRecorderStatus) => void;
  elapsedSeconds: number;
  previewUri: string | null;
  previewSeconds: number;
  /** Requests permission and begins recording. Returns true if recording started. */
  start: () => Promise<boolean>;
  /** Stops recording and transitions to preview. */
  stop: () => Promise<void>;
  /** Discards the current preview recording and returns to idle. */
  discard: () => void;
};

/**
 * Encapsulates the local audio recording lifecycle (permission, recording with
 * a 15-minute cap, preview, discard). UI and persistence are left to callers so
 * both Free Flow and Guided Speak can share identical recording behavior.
 */
export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewSeconds, setPreviewSeconds] = useState(0);

  const elapsedSeconds = Math.floor(recorderState.durationMillis / 1000);

  const stop = useCallback(async () => {
    try {
      const seconds = Math.min(
        Math.round(recorderState.durationMillis / 1000),
        MAX_RECORDING_SECONDS,
      );
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setStatus("error");
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
      setPreviewUri(uri);
      setPreviewSeconds(seconds);
      setStatus("preview");
    } catch (error: unknown) {
      console.warn(
        "Failed to stop recording:",
        error instanceof Error ? error.message : "unknown error",
      );
      setStatus("error");
    }
  }, [recorder, recorderState.durationMillis]);

  // Enforce the 15-minute MVP limit.
  useEffect(() => {
    if (status === "recording" && elapsedSeconds >= MAX_RECORDING_SECONDS) {
      void stop();
    }
  }, [status, elapsedSeconds, stop]);

  const start = useCallback(async () => {
    setStatus("requesting");
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setStatus("denied");
        return false;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus("recording");
      return true;
    } catch (error: unknown) {
      console.warn(
        "Failed to start recording:",
        error instanceof Error ? error.message : "unknown error",
      );
      setStatus("error");
      return false;
    }
  }, [recorder]);

  const discard = useCallback(() => {
    if (previewUri) {
      deleteLocalFile(previewUri);
    }
    setPreviewUri(null);
    setPreviewSeconds(0);
    setStatus("idle");
  }, [previewUri]);

  return {
    status,
    setStatus,
    elapsedSeconds,
    previewUri,
    previewSeconds,
    start,
    stop,
    discard,
  };
}
