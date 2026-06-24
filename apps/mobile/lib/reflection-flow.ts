export type ReflectionStyle = "free-flow" | "guided";

export type GuidedMode = "regular" | "lament" | "rejoice";

export type InputMethod = "speak" | "type";

export const reflectionStyles = [
  {
    id: "free-flow" as const,
    title: "Free Flow",
    description:
      "Ramble honestly about your day. No structure required — just bring what is real before God.",
    variant: "primary" as const,
  },
  {
    id: "guided" as const,
    title: "Guided Reflection",
    description:
      "Gentle prompts to help you process your day with structure and spiritual care.",
    variant: "default" as const,
  },
] as const;

export const guidedModes = [
  {
    id: "regular" as const,
    title: "Regular Reflection",
    description:
      "Walk through your day — what felt heavy, what felt good, and where you noticed grace.",
    accentColor: undefined,
  },
  {
    id: "lament" as const,
    title: "Lament",
    description:
      "Bring your complaint before God honestly. There is no rush to move past grief.",
    accentColor: "#6F8798",
  },
  {
    id: "rejoice" as const,
    title: "Rejoice",
    description:
      "Notice good gifts, answered prayers, and ordinary mercies from today.",
    accentColor: "#D6A84F",
  },
] as const;

export const inputMethods = [
  {
    id: "speak" as const,
    title: "Speak",
    description: "Record a voice reflection up to 15 minutes.",
    variant: "primary" as const,
  },
  {
    id: "type" as const,
    title: "Type",
    description: "Write freely in an open, unhurried space.",
    variant: "default" as const,
  },
] as const;

export const guidedModeLabels: Record<GuidedMode, string> = {
  regular: "Regular Reflection",
  lament: "Lament",
  rejoice: "Rejoice",
};

export function isGuidedMode(value: string): value is GuidedMode {
  return value === "regular" || value === "lament" || value === "rejoice";
}

export type GuidedPrompt = {
  id: string;
  label: string;
  placeholder: string;
};

export type GuidedModeConfig = {
  mode: GuidedMode;
  title: string;
  /** Short, gentle copy shown under the title to set the tone. */
  helper: string;
  /** Optional softer note for modes that need extra care (e.g. lament). */
  note?: string;
  accentColor?: string;
  /** Used as the entry title when no answer is meaningful enough to derive one. */
  fallbackTitle: string;
  prompts: GuidedPrompt[];
};

export const guidedModeConfigs: Record<GuidedMode, GuidedModeConfig> = {
  regular: {
    mode: "regular",
    title: "Regular Reflection",
    helper:
      "Move through gently. Answer what feels true today — you can leave any prompt blank.",
    fallbackTitle: "Regular reflection",
    prompts: [
      {
        id: "happened",
        label: "What happened today?",
        placeholder: "Walk through your day as it comes to mind…",
      },
      {
        id: "heavy",
        label: "What felt heavy?",
        placeholder: "Name what weighed on you, even quietly…",
      },
      {
        id: "good",
        label: "What felt good?",
        placeholder: "Notice anything that brought light or ease…",
      },
      {
        id: "grace",
        label: "Where did you notice God's grace?",
        placeholder: "A moment, a person, a provision, a peace…",
      },
      {
        id: "confess",
        label: "Is there anything you need to confess, surrender, or revisit?",
        placeholder: "Bring it honestly — there is no condemnation here…",
      },
      {
        id: "pray",
        label: "What do you want to pray about?",
        placeholder: "Put words to what you're carrying to God…",
      },
    ],
  },
  lament: {
    mode: "lament",
    title: "Lament",
    helper:
      "Bring what is real before God. You can be honest about pain, confusion, and anger here.",
    note: "There is no rush to resolve this or move past your grief. Take the time you need.",
    accentColor: "#6F8798",
    fallbackTitle: "Lament reflection",
    prompts: [
      {
        id: "happened",
        label: "What happened?",
        placeholder: "Describe what brought you here…",
      },
      {
        id: "painful",
        label: "What feels painful, unfair, confusing, or heavy?",
        placeholder: "Let it be honest. God can hold all of it…",
      },
      {
        id: "wish",
        label: "What do you wish God would do?",
        placeholder: "Ask boldly. You are allowed to long out loud…",
      },
      {
        id: "true",
        label: "What do you know is still true about God?",
        placeholder: "Even now, what holds — His character, His promises…",
      },
      {
        id: "trust",
        label: "What would trust look like today?",
        placeholder: "Not pretending — just one small step toward Him…",
      },
    ],
  },
  rejoice: {
    mode: "rejoice",
    title: "Rejoice",
    helper:
      "Notice God's specific kindness today. Small, ordinary mercies count just as much.",
    accentColor: "#D6A84F",
    fallbackTitle: "Rejoice reflection",
    prompts: [
      {
        id: "good",
        label: "What good thing happened today?",
        placeholder: "Name something specific, however small…",
      },
      {
        id: "answered",
        label: "What prayer may God be answering?",
        placeholder: "Something you've been bringing to Him…",
      },
      {
        id: "mercy",
        label: "What ordinary mercy did you experience?",
        placeholder: "Rest, food, a kind word, a quiet moment…",
      },
      {
        id: "blessed",
        label: "Who did God use to bless you?",
        placeholder: "A person who carried His care to you…",
      },
      {
        id: "care",
        label: "What does this reveal about God's care?",
        placeholder: "What might He be showing you about His heart…",
      },
    ],
  },
};

export type GuidedAnswers = Record<string, string>;

function firstMeaningfulAnswer(
  config: GuidedModeConfig,
  answers: GuidedAnswers,
): string | null {
  for (const prompt of config.prompts) {
    const value = answers[prompt.id]?.trim();
    if (value && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function hasMeaningfulAnswer(
  config: GuidedModeConfig,
  answers: GuidedAnswers,
): boolean {
  return firstMeaningfulAnswer(config, answers) !== null;
}

/**
 * Builds a readable reflection from the answered prompts only. Each answered
 * prompt is rendered as its label followed by the user's answer, so the entry
 * reads cleanly in the journal and when edited later.
 */
export function compileGuidedReflection(
  config: GuidedModeConfig,
  answers: GuidedAnswers,
): string {
  return config.prompts
    .map((prompt) => {
      const value = answers[prompt.id]?.trim();
      if (!value) {
        return null;
      }
      return `${prompt.label}\n${value}`;
    })
    .filter((section): section is string => section !== null)
    .join("\n\n");
}

const MAX_GUIDED_TITLE_LENGTH = 60;

/**
 * Derives a title from the first meaningful answer, falling back to a calm,
 * mode-based label (e.g. "Lament reflection") when nothing substantial exists.
 */
export function deriveGuidedTitle(
  config: GuidedModeConfig,
  answers: GuidedAnswers,
): string {
  const answer = firstMeaningfulAnswer(config, answers);
  if (!answer) {
    return config.fallbackTitle;
  }

  const firstLine = answer.split("\n")[0]?.trim() ?? answer;
  if (firstLine.length === 0) {
    return config.fallbackTitle;
  }
  if (firstLine.length <= MAX_GUIDED_TITLE_LENGTH) {
    return firstLine;
  }
  return `${firstLine.slice(0, MAX_GUIDED_TITLE_LENGTH).trimEnd()}…`;
}
