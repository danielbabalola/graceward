import { describe, expect, it } from "vitest";
import {
  buildBugReportBody,
  buildFeedbackBody,
  buildMailtoUrl,
  describeApiEnvironment,
  formatDiagnostics,
  redactApiUrl,
  type DiagnosticInfo,
} from "@/lib/diagnostics";

const sampleInfo: DiagnosticInfo = {
  appName: "Graceward",
  appVersion: "1.0.0",
  buildNumber: "42",
  platform: "ios",
  osVersion: "18.0",
  apiHost: "api.graceward.app",
  apiEnvironment: "production",
  timestamp: "2026-06-24T20:51:00.000Z",
};

describe("redactApiUrl", () => {
  it("keeps only the host (with port)", () => {
    expect(redactApiUrl("http://localhost:3000")).toBe("localhost:3000");
    expect(redactApiUrl("https://api.graceward.app")).toBe("api.graceward.app");
    expect(redactApiUrl("https://api.graceward.app/ai/analyze?x=1")).toBe(
      "api.graceward.app",
    );
  });

  it("drops embedded credentials and query strings", () => {
    expect(redactApiUrl("https://user:secret@api.graceward.app/path")).toBe(
      "api.graceward.app",
    );
  });

  it("returns 'redacted' for empty or unparseable input", () => {
    expect(redactApiUrl(null)).toBe("redacted");
    expect(redactApiUrl(undefined)).toBe("redacted");
    expect(redactApiUrl("")).toBe("redacted");
  });
});

describe("describeApiEnvironment", () => {
  it("labels localhost as local", () => {
    expect(describeApiEnvironment("http://localhost:3000")).toBe("local");
    expect(describeApiEnvironment("http://127.0.0.1:3000")).toBe("local");
  });

  it("labels private LAN IPs as dev", () => {
    expect(describeApiEnvironment("http://192.168.1.50:3000")).toBe("dev");
    expect(describeApiEnvironment("http://10.0.0.5:3000")).toBe("dev");
    expect(describeApiEnvironment("http://172.16.0.1:3000")).toBe("dev");
  });

  it("labels public https as production", () => {
    expect(describeApiEnvironment("https://api.graceward.app")).toBe(
      "production",
    );
  });

  it("labels public http as dev", () => {
    expect(describeApiEnvironment("http://api.graceward.app")).toBe("dev");
  });

  it("labels missing input as unknown", () => {
    expect(describeApiEnvironment(null)).toBe("unknown");
  });
});

describe("formatDiagnostics", () => {
  it("includes only safe metadata", () => {
    const text = formatDiagnostics(sampleInfo);
    expect(text).toContain("Version: 1.0.0");
    expect(text).toContain("Build: 42");
    expect(text).toContain("Platform: ios");
    expect(text).toContain("API host: api.graceward.app");
    expect(text).toContain("Captured: 2026-06-24T20:51:00.000Z");
  });

  it("falls back to 'unknown' for missing fields", () => {
    const text = formatDiagnostics({
      ...sampleInfo,
      appVersion: null,
      buildNumber: null,
      platform: null,
      osVersion: null,
    });
    expect(text).toContain("Version: unknown");
    expect(text).toContain("Build: unknown");
  });

  it("never leaks a full URL or scheme", () => {
    const text = formatDiagnostics(sampleInfo);
    expect(text).not.toContain("https://");
    expect(text).not.toContain("http://");
  });
});

describe("buildBugReportBody", () => {
  it("prompts the tester and appends safe diagnostics", () => {
    const body = buildBugReportBody(sampleInfo);
    expect(body).toContain("What were you doing?");
    expect(body).toContain("What happened?");
    expect(body).toContain("What did you expect");
    expect(body).toContain("Version: 1.0.0");
    expect(body).not.toContain("https://");
  });
});

describe("buildFeedbackBody", () => {
  it("does not attach diagnostics by default", () => {
    const body = buildFeedbackBody();
    expect(body).not.toContain("Version:");
    expect(body).not.toContain("API host:");
  });
});

describe("buildMailtoUrl", () => {
  it("percent-encodes subject and body", () => {
    const url = buildMailtoUrl("test@example.com", "Bug report", "Line 1\nLine 2");
    expect(url.startsWith("mailto:test@example.com?")).toBe(true);
    expect(url).toContain("subject=Bug%20report");
    expect(url).toContain("Line%201%0ALine%202");
  });
});
