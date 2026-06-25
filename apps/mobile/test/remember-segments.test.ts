import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMEMBER_SEGMENT,
  parseRememberSegment,
} from "@/lib/remember-segments";

describe("parseRememberSegment", () => {
  it("maps the gratitude param (singular or plural) to gratitudes", () => {
    expect(parseRememberSegment("gratitude")).toBe("gratitudes");
    expect(parseRememberSegment("gratitudes")).toBe("gratitudes");
  });

  it("maps faithfulness and lessons through unchanged", () => {
    expect(parseRememberSegment("faithfulness")).toBe("faithfulness");
    expect(parseRememberSegment("lessons")).toBe("lessons");
  });

  it("maps the revelation param (singular or plural) to revelations", () => {
    expect(parseRememberSegment("revelation")).toBe("revelations");
    expect(parseRememberSegment("revelations")).toBe("revelations");
  });

  it("maps the instruction param (singular or plural) to instructions", () => {
    expect(parseRememberSegment("instruction")).toBe("instructions");
    expect(parseRememberSegment("instructions")).toBe("instructions");
  });

  it("defaults to gratitudes for an unknown value", () => {
    expect(parseRememberSegment("nonsense")).toBe(DEFAULT_REMEMBER_SEGMENT);
    expect(parseRememberSegment("lesson")).toBe(DEFAULT_REMEMBER_SEGMENT);
  });

  it("defaults to gratitudes for undefined or null", () => {
    expect(parseRememberSegment(undefined)).toBe("gratitudes");
    expect(parseRememberSegment(null)).toBe("gratitudes");
  });

  it("uses the first entry when given an array param", () => {
    expect(parseRememberSegment(["lessons", "faithfulness"])).toBe("lessons");
    expect(parseRememberSegment([])).toBe("gratitudes");
  });
});
