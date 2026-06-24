import { describe, expect, it } from "vitest";
import {
  AI_DISABLED_CODE,
  AI_QUOTA_EXCEEDED_CODE,
  INSTALL_ID_HEADER,
  INSTALL_ID_REQUIRED_CODE,
  isValidInstallId,
} from "../src/index.js";

describe("isValidInstallId", () => {
  it("accepts UUID-shaped IDs (any version), case-insensitively", () => {
    expect(isValidInstallId("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isValidInstallId("AB23F4C5-1234-1234-1234-1234567890AB")).toBe(true);
    // crypto.randomUUID()-style v4 value.
    expect(isValidInstallId("9f1c0e2a-7b3d-4c8e-9a10-2b3c4d5e6f70")).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidInstallId("  11111111-1111-4111-8111-111111111111  ")).toBe(
      true,
    );
  });

  it("rejects missing, empty, and non-string values", () => {
    expect(isValidInstallId(undefined)).toBe(false);
    expect(isValidInstallId(null)).toBe(false);
    expect(isValidInstallId("")).toBe(false);
    expect(isValidInstallId(12345)).toBe(false);
    expect(isValidInstallId({})).toBe(false);
  });

  it("rejects non-UUID and malformed strings", () => {
    expect(isValidInstallId("not-a-uuid")).toBe(false);
    expect(isValidInstallId("11111111111141118111111111111111")).toBe(false);
    expect(isValidInstallId("11111111-1111-4111-8111")).toBe(false);
    expect(isValidInstallId("zzzzzzzz-1111-4111-8111-111111111111")).toBe(false);
  });
});

describe("access-control constants", () => {
  it("exposes the install ID header in lower case (Fastify lowercases headers)", () => {
    expect(INSTALL_ID_HEADER).toBe("x-graceward-install-id");
  });

  it("exposes stable error codes", () => {
    expect(INSTALL_ID_REQUIRED_CODE).toBe("INSTALL_ID_REQUIRED");
    expect(AI_QUOTA_EXCEEDED_CODE).toBe("AI_QUOTA_EXCEEDED");
    expect(AI_DISABLED_CODE).toBe("AI_DISABLED");
  });
});
