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

type PlaceholderContent = {
  title: string;
  subtitle: string;
  body: string;
  note?: string;
};

export const reflectionPlaceholders: Record<string, PlaceholderContent> = {
  "free-flow-type": {
    title: "Free Flow · Type",
    subtitle: "An open writing space is coming next.",
    body: "You will be able to type freely about your day, save locally, and optionally submit for AI reflection later.",
  },
  "free-flow-speak": {
    title: "Free Flow · Speak",
    subtitle: "Voice recording is coming next.",
    body: "You will be able to record up to 15 minutes, pause, preview, discard, or save — with audio kept on your device.",
  },
  "regular-type": {
    title: "Regular Reflection · Type",
    subtitle: "Guided prompts with text are coming next.",
    body: "Gentle questions will help you reflect on what happened, what felt heavy or good, where you noticed grace, and what you want to pray about.",
  },
  "regular-speak": {
    title: "Regular Reflection · Speak",
    subtitle: "Guided prompts with voice are coming next.",
    body: "The same thoughtful prompts will guide your spoken reflection, saved locally on your device.",
  },
  "lament-type": {
    title: "Lament · Type",
    subtitle: "A space for honest grief is coming next.",
    body: "You will be guided to turn to God, bring your complaint, ask boldly, remember His character, and choose trust — at your own pace.",
    note: "This flow will not rush you out of grief.",
  },
  "lament-speak": {
    title: "Lament · Speak",
    subtitle: "Spoken lament is coming next.",
    body: "Voice-guided prompts will help you bring what feels painful, unfair, or heavy before God — without hurrying you forward.",
    note: "This flow will not rush you out of grief.",
  },
  "rejoice-type": {
    title: "Rejoice · Type",
    subtitle: "A space to notice goodness is coming next.",
    body: "Prompts will help you name good things, possible answered prayers, ordinary mercies, and signs of God's care.",
  },
  "rejoice-speak": {
    title: "Rejoice · Speak",
    subtitle: "Spoken rejoicing is coming next.",
    body: "Voice-guided prompts will help you celebrate God's goodness and care from today.",
  },
};
