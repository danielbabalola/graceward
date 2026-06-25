import type { Revelation, RevelationKind } from "@graceward/shared";
import { isTodayOrPast } from "@/lib/dates";
import { formatItemDate } from "@/lib/gratitude-display";

/** Singular, user-facing label for a revelation kind. */
export function revelationKindLabel(kind: RevelationKind): string {
  switch (kind) {
    case "dream":
      return "Dream";
    case "prophecy":
      return "Prophecy";
    case "instruction":
      return "Instruction";
  }
}

/** The word used when a revelation of this kind reaches its "done" state. */
export function revelationFulfilledLabel(kind: RevelationKind): string {
  // An instruction is "Fulfilled" once acted on; a dream or prophecy has "Come
  // to pass" once it's seen to be realized.
  return kind === "instruction" ? "Fulfilled" : "Came to pass";
}

/**
 * Whether an active instruction's gentle "by when" day has arrived or passed.
 * Only instructions carry a due date; other kinds, fulfilled ones, and those
 * without a target date are never "due".
 */
export function revelationIsDue(revelation: Revelation): boolean {
  if (
    revelation.kind !== "instruction" ||
    revelation.status !== "active" ||
    !revelation.dueAt
  ) {
    return false;
  }
  return isTodayOrPast(revelation.dueAt);
}

/**
 * Meta line for a revelation card. Optionally prefixed with the kind (used in
 * the mixed Revelations list to tell dreams, prophecies, and instructions
 * apart). Includes a fulfilled/come-to-pass marker once done, and an
 * instruction's optional "by when" target while it's still active — softening
 * into a gentle "Time to revisit" rather than a hard, overdue-style deadline.
 * Tags are shown separately as chips.
 */
export function revelationMetaLine(
  revelation: Revelation,
  includeKind = true,
): string {
  const prefix = includeKind
    ? `${revelationKindLabel(revelation.kind)} · `
    : "";
  // Prefer the user-set day it was received (dream/prophecy); instructions have
  // no occurred date and fall back to when it was recorded.
  const date = formatItemDate(revelation.occurredAt ?? revelation.createdAt);

  if (revelation.status === "fulfilled") {
    return `${prefix}${date} · ${revelationFulfilledLabel(revelation.kind)}`;
  }
  if (!revelation.dueAt || revelation.kind !== "instruction") {
    return `${prefix}${date}`;
  }
  return revelationIsDue(revelation)
    ? `${prefix}${date} · Time to revisit`
    : `${prefix}${date} · By ${formatItemDate(revelation.dueAt)}`;
}
