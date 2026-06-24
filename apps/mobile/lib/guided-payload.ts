import {
  guidedModeConfigs,
  isGuidedMode,
  type GuidedAnswers,
  type GuidedMode,
  type GuidedModeConfig,
} from "@/lib/reflection-flow";

export const GUIDED_PAYLOAD_KIND = "guided_reflection";
export const GUIDED_PAYLOAD_SCHEMA_VERSION = 1;

export type GuidedPayloadInputType = "text" | "voice";

export type GuidedPromptAnswer = {
  id: string;
  label: string;
  answer: string;
};

export type GuidedPromptRef = {
  id: string;
  label: string;
};

export type GuidedPromptMarker = {
  promptId: string;
  label: string;
  startedAtSeconds: number;
};

export type GuidedTextPayload = {
  kind: typeof GUIDED_PAYLOAD_KIND;
  schemaVersion: typeof GUIDED_PAYLOAD_SCHEMA_VERSION;
  mode: GuidedMode;
  inputType: "text";
  prompts: GuidedPromptAnswer[];
};

export type GuidedVoicePayload = {
  kind: typeof GUIDED_PAYLOAD_KIND;
  schemaVersion: typeof GUIDED_PAYLOAD_SCHEMA_VERSION;
  mode: GuidedMode;
  inputType: "voice";
  prompts: GuidedPromptRef[];
  promptMarkers: GuidedPromptMarker[];
};

export type GuidedStructuredPayload = GuidedTextPayload | GuidedVoicePayload;

/**
 * Builds a versioned text payload from the mode config and the user's answers.
 * All prompts are stored (with possibly-empty answers) so editing can reopen
 * the full prompt set.
 */
export function buildGuidedTextPayload(
  config: GuidedModeConfig,
  answers: GuidedAnswers,
): GuidedTextPayload {
  return {
    kind: GUIDED_PAYLOAD_KIND,
    schemaVersion: GUIDED_PAYLOAD_SCHEMA_VERSION,
    mode: config.mode,
    inputType: "text",
    prompts: config.prompts.map((prompt) => ({
      id: prompt.id,
      label: prompt.label,
      answer: answers[prompt.id]?.trim() ?? "",
    })),
  };
}

/**
 * Builds a versioned voice payload describing the prompts presented and the
 * markers captured while recording one continuous audio file.
 */
export function buildGuidedVoicePayload(
  config: GuidedModeConfig,
  markers: GuidedPromptMarker[],
): GuidedVoicePayload {
  return {
    kind: GUIDED_PAYLOAD_KIND,
    schemaVersion: GUIDED_PAYLOAD_SCHEMA_VERSION,
    mode: config.mode,
    inputType: "voice",
    prompts: config.prompts.map((prompt) => ({
      id: prompt.id,
      label: prompt.label,
    })),
    promptMarkers: markers,
  };
}

function isPromptAnswerArray(value: unknown): value is GuidedPromptAnswer[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as GuidedPromptAnswer).id === "string" &&
        typeof (item as GuidedPromptAnswer).label === "string" &&
        typeof (item as GuidedPromptAnswer).answer === "string",
    )
  );
}

function isPromptRefArray(value: unknown): value is GuidedPromptRef[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as GuidedPromptRef).id === "string" &&
        typeof (item as GuidedPromptRef).label === "string",
    )
  );
}

function isMarkerArray(value: unknown): value is GuidedPromptMarker[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as GuidedPromptMarker).promptId === "string" &&
        typeof (item as GuidedPromptMarker).label === "string" &&
        typeof (item as GuidedPromptMarker).startedAtSeconds === "number",
    )
  );
}

/**
 * Safely parses a stored payload string. Returns null for missing, malformed,
 * unknown-kind, or unsupported-version payloads so callers can fall back to the
 * legacy raw_text behavior. Never throws.
 */
export function parseStructuredPayload(
  raw: string | null | undefined,
): GuidedStructuredPayload | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;
  if (candidate.kind !== GUIDED_PAYLOAD_KIND) {
    return null;
  }
  if (candidate.schemaVersion !== GUIDED_PAYLOAD_SCHEMA_VERSION) {
    return null;
  }
  if (typeof candidate.mode !== "string" || !isGuidedMode(candidate.mode)) {
    return null;
  }

  if (candidate.inputType === "text") {
    if (!isPromptAnswerArray(candidate.prompts)) {
      return null;
    }
    return {
      kind: GUIDED_PAYLOAD_KIND,
      schemaVersion: GUIDED_PAYLOAD_SCHEMA_VERSION,
      mode: candidate.mode,
      inputType: "text",
      prompts: candidate.prompts,
    };
  }

  if (candidate.inputType === "voice") {
    if (!isPromptRefArray(candidate.prompts)) {
      return null;
    }
    const markers = isMarkerArray(candidate.promptMarkers)
      ? candidate.promptMarkers
      : [];
    return {
      kind: GUIDED_PAYLOAD_KIND,
      schemaVersion: GUIDED_PAYLOAD_SCHEMA_VERSION,
      mode: candidate.mode,
      inputType: "voice",
      prompts: candidate.prompts,
      promptMarkers: markers,
    };
  }

  return null;
}

/**
 * Compiles a readable reflection (prompt label + answer) from a text payload,
 * including only prompts with a meaningful answer. Pure.
 */
export function compileGuidedReflectionFromPayload(
  payload: GuidedTextPayload,
): string {
  return payload.prompts
    .map((prompt) => {
      const value = prompt.answer.trim();
      if (!value) {
        return null;
      }
      return `${prompt.label}\n${value}`;
    })
    .filter((section): section is string => section !== null)
    .join("\n\n");
}

/** Converts a stored text payload back into editable answers keyed by prompt id. */
export function payloadToAnswers(payload: GuidedTextPayload): GuidedAnswers {
  const answers: GuidedAnswers = {};
  for (const prompt of payload.prompts) {
    answers[prompt.id] = prompt.answer;
  }
  return answers;
}

/** Resolves the mode config for a parsed payload. */
export function configForPayload(
  payload: GuidedStructuredPayload,
): GuidedModeConfig {
  return guidedModeConfigs[payload.mode];
}
