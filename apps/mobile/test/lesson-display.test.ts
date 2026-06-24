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
  it("includes the theme when present", () => {
    const line = lessonMetaLine(makeLesson({ theme: "Trust" }));
    expect(line).toContain("Trust");
    expect(line).not.toContain("Archived");
  });

  it("omits the theme separator when there is no theme", () => {
    const line = lessonMetaLine(makeLesson({ theme: null }));
    expect(line).not.toContain("·");
    expect(line).not.toContain("Archived");
  });

  it("treats a blank theme as no theme", () => {
    const line = lessonMetaLine(makeLesson({ theme: "   " }));
    expect(line).not.toContain("·");
  });

  it("marks archived lessons", () => {
    const line = lessonMetaLine(makeLesson({ status: "archived" }));
    expect(line).toContain("Archived");
  });

  it("shows both theme and archived marker", () => {
    const line = lessonMetaLine(
      makeLesson({ theme: "Patience", status: "archived" }),
    );
    expect(line).toContain("Patience");
    expect(line).toContain("Archived");
  });
});
