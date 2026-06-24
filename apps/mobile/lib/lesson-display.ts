import type { Lesson } from "@graceward/shared";
import { formatItemDate } from "@/lib/gratitude-display";

/**
 * Meta line for a lesson card: its date, optionally followed by the theme, and
 * an "Archived" marker when the lesson is no longer active.
 */
export function lessonMetaLine(lesson: Lesson): string {
  const date = formatItemDate(lesson.createdAt);
  const theme = lesson.theme?.trim();
  const base = theme ? `${date} · ${theme}` : date;
  return lesson.status === "archived" ? `${base} · Archived` : base;
}
