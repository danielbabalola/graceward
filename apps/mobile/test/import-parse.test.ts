import { describe, expect, it } from "vitest";
import { parseLocalDataExport } from "@/lib/import-parse";

function exportFile(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ app: "Graceward", ...overrides });
}

describe("parseLocalDataExport", () => {
  it("rejects text that isn't valid JSON", () => {
    const result = parseLocalDataExport("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/valid JSON/i);
    }
  });

  it("rejects a JSON value that isn't an object", () => {
    expect(parseLocalDataExport("[]").ok).toBe(false);
    expect(parseLocalDataExport('"hello"').ok).toBe(false);
    expect(parseLocalDataExport("null").ok).toBe(false);
  });

  it("rejects files that aren't Graceward exports", () => {
    const result = parseLocalDataExport(
      JSON.stringify({ app: "SomethingElse", gratitudes: [{ id: "g1" }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Graceward export/i);
    }
  });

  it("rejects a Graceward export with nothing to import", () => {
    const result = parseLocalDataExport(exportFile());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/doesn't contain any entries/i);
    }
  });

  it("keeps valid rows and reports per-kind counts", () => {
    const result = parseLocalDataExport(
      exportFile({
        journalEntries: [{ id: "j1" }, { id: "j2" }],
        gratitudes: [{ id: "g1", content: "Thankful" }],
        revelations: [{ id: "r1", kind: "dream" }],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.counts.journalEntries).toBe(2);
      expect(result.counts.gratitudes).toBe(1);
      expect(result.counts.revelations).toBe(1);
      expect(result.counts.lessons).toBe(0);
      expect(result.data.gratitudes[0]).toMatchObject({ content: "Thankful" });
    }
  });

  it("drops rows that are not objects or lack a string id", () => {
    const result = parseLocalDataExport(
      exportFile({
        gratitudes: [
          { id: "g1" },
          { id: "" },
          { content: "no id" },
          "nope",
          null,
          42,
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.counts.gratitudes).toBe(1);
      expect(result.data.gratitudes.map((g) => g.id)).toEqual(["g1"]);
    }
  });

  it("keeps only tag links that carry the ids needed to reattach them", () => {
    const result = parseLocalDataExport(
      exportFile({
        tags: [{ id: "t1", name: "Family", slug: "family" }],
        entryTags: [
          {
            id: "et1",
            tagId: "t1",
            entryType: "gratitude",
            entryId: "g1",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          { id: "et2", tagId: "t1" },
          { id: "et3", entryType: "gratitude", entryId: "g1" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.counts.entryTags).toBe(1);
      expect(result.data.entryTags[0].id).toBe("et1");
    }
  });

  it("treats non-array collections as empty", () => {
    const result = parseLocalDataExport(
      exportFile({
        gratitudes: { id: "not-an-array" },
        lessons: [{ id: "l1" }],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.counts.gratitudes).toBe(0);
      expect(result.counts.lessons).toBe(1);
    }
  });
});
