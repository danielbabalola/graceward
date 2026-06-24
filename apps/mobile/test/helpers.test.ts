import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/journal-display";
import {
  compileGuidedReflection,
  deriveGuidedTitle,
  guidedModeConfigs,
  hasMeaningfulAnswer,
} from "@/lib/reflection-flow";

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("clamps negative input to zero", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });

  it("floors fractional seconds", () => {
    expect(formatDuration(9.9)).toBe("0:09");
  });
});

describe("guided reflection helpers", () => {
  const config = guidedModeConfigs.lament;
  const firstId = config.prompts[0]!.id;
  const firstLabel = config.prompts[0]!.label;
  const secondId = config.prompts[1]!.id;
  const secondLabel = config.prompts[1]!.label;

  it("hasMeaningfulAnswer is false when answers are blank", () => {
    expect(hasMeaningfulAnswer(config, {})).toBe(false);
    expect(hasMeaningfulAnswer(config, { [firstId]: "   " })).toBe(false);
  });

  it("hasMeaningfulAnswer is true with a non-empty answer", () => {
    expect(hasMeaningfulAnswer(config, { [firstId]: "something real" })).toBe(
      true,
    );
  });

  it("compileGuidedReflection includes answered prompts only", () => {
    const text = compileGuidedReflection(config, {
      [firstId]: "I am hurting",
      [secondId]: "   ",
    });
    expect(text).toContain(firstLabel);
    expect(text).toContain("I am hurting");
    expect(text).not.toContain(secondLabel);
  });

  it("deriveGuidedTitle uses the first answer's first line", () => {
    expect(
      deriveGuidedTitle(config, { [firstId]: "A hard day\nmore detail" }),
    ).toBe("A hard day");
  });

  it("deriveGuidedTitle falls back to the mode label when empty", () => {
    expect(deriveGuidedTitle(config, {})).toBe(config.fallbackTitle);
  });

  it("deriveGuidedTitle truncates very long first lines", () => {
    const title = deriveGuidedTitle(config, { [firstId]: "x".repeat(80) });
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
  });
});
