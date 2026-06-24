import { describe, expect, it } from "vitest";
import {
  AI_ACCESS_MESSAGES,
  INSTALL_ID_HEADER,
} from "@/lib/api/ai-access-messages";

describe("AI access control copy", () => {
  it("maps every access-control error code to calm, non-technical copy", () => {
    expect(AI_ACCESS_MESSAGES.AI_DISABLED).toBe(
      "Graceward's AI features are temporarily unavailable.",
    );
    expect(AI_ACCESS_MESSAGES.AI_QUOTA_EXCEEDED).toBe(
      "You've reached today's AI limit for this beta. Try again tomorrow.",
    );
    expect(typeof AI_ACCESS_MESSAGES.INSTALL_ID_REQUIRED).toBe("string");
    expect(AI_ACCESS_MESSAGES.INSTALL_ID_REQUIRED.length).toBeGreaterThan(0);
  });

  it("never exposes quota internals (numbers/limits) in the copy", () => {
    for (const message of Object.values(AI_ACCESS_MESSAGES)) {
      expect(message).not.toMatch(/\d/);
      expect(message.toLowerCase()).not.toContain("quota");
    }
  });

  it("sends the install ID under the expected header name", () => {
    expect(INSTALL_ID_HEADER).toBe("X-Graceward-Install-Id");
  });
});
