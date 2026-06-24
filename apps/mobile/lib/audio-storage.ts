import { Directory, File, Paths } from "expo-file-system";

export type PersistedAudio = {
  localFilePath: string;
  fileSizeBytes: number | null;
  mimeType: string;
};

const AUDIO_DIRECTORY = "audio";
const AUDIO_MIME_TYPE = "audio/m4a";

/**
 * Copies a freshly recorded file from its temporary location into the app's
 * document directory so it persists locally. Returns metadata for storage.
 */
export function persistRecording(tempUri: string, id: string): PersistedAudio {
  const dir = new Directory(Paths.document, AUDIO_DIRECTORY);
  if (!dir.exists) {
    dir.create();
  }

  const source = new File(tempUri);
  const destination = new File(dir, `${id}.m4a`);
  if (destination.exists) {
    destination.delete();
  }
  source.copy(destination);

  try {
    if (source.exists) {
      source.delete();
    }
  } catch {
    // Best-effort cleanup of the temporary recording; ignore failures.
  }

  return {
    localFilePath: destination.uri,
    fileSizeBytes: destination.size ?? null,
    mimeType: AUDIO_MIME_TYPE,
  };
}

export function deleteLocalFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort; ignore failures.
  }
}

export function localFileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
