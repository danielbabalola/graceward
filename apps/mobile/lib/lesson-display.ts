import type { Lesson } from "@graceward/shared";
import { formatItemDate } from "@/lib/gratitude-display";

/**
 * Meta line for a lesson card: its date, with an "Archived" marker when the
 * lesson is no longer active. Tags are shown separately as chips.
 */
export function lessonMetaLine(lesson: Lesson): string {
  const date = formatItemDate(lesson.createdAt);
  return lesson.status === "archived" ? `${date} · Archived` : date;
}
