import type { Instruction } from "@graceward/shared";
import { isTodayOrPast } from "@/lib/dates";
import { formatItemDate } from "@/lib/gratitude-display";

/**
 * Whether an active instruction's gentle "by when" day has arrived or passed.
 * Fulfilled instructions and those without a target date are never "due".
 */
export function instructionIsDue(instruction: Instruction): boolean {
  if (instruction.status !== "active" || !instruction.dueAt) {
    return false;
  }
  return isTodayOrPast(instruction.dueAt);
}

/**
 * Meta line for an instruction card: its date, a "Fulfilled" marker once the
 * user has acted on it, and an optional "by when" target while it's still
 * active. Once that day arrives it softens into a gentle "Time to revisit"
 * rather than a hard, overdue-style deadline. Tags are shown separately as chips.
 */
export function instructionMetaLine(instruction: Instruction): string {
  const date = formatItemDate(instruction.createdAt);
  if (instruction.status === "fulfilled") {
    return `${date} · Fulfilled`;
  }
  if (!instruction.dueAt) {
    return date;
  }
  return instructionIsDue(instruction)
    ? `${date} · Time to revisit`
    : `${date} · By ${formatItemDate(instruction.dueAt)}`;
}
