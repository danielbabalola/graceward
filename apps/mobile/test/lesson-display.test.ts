import { describe, expect, it } from "vitest";
import type { Lesson } from "@graceward/shared";
import { lessonMetaLine } from "@/lib/lesson-display";

function makeLesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: "lesson_1",
    title: "Trusting in waiting",
    content: "Patience is growing.",
    theme: null,
    sourceJournalEntryId: null,
    status: "active",
    syncStatus: "local_only",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("lessonMetaLine", () => {
  it("shows only the date for an active lesson (tags render as chips)", () => {
    const line = lessonMetaLine(makeLesson({ status: "active" }));
    expect(line).not.toContain("·");
    expect(line).not.toContain("Archived");
  });

  it("ignores the deprecated theme field in the meta line", () => {
    const line = lessonMetaLine(makeLesson({ theme: "Trust" }));
    expect(line).not.toContain("Trust");
  });

  it("marks archived lessons", () => {
    const line = lessonMetaLine(makeLesson({ status: "archived" }));
    expect(line).toContain("Archived");
  });
});
