import type { Gratitude, Win } from "@graceward/shared";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function formatItemDate(value: string): string {
  // Date-only values (e.g. a user-set "occurred" day) must be parsed as local
  // midnight, not UTC, or they can render as the previous day in western zones.
  const parsed = new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const MAX_PREVIEW_LENGTH = 140;

export function contentPreview(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "—";
  }
  const firstLine = trimmed.split("\n")[0]?.trim() ?? trimmed;
  if (firstLine.length <= MAX_PREVIEW_LENGTH) {
    return firstLine;
  }
  return `${firstLine.slice(0, MAX_PREVIEW_LENGTH).trimEnd()}…`;
}

/**
 * Meta line for a gratitude card. Tags are shown separately as chips, so the
 * meta is just the date.
 */
export function gratitudeMetaLine(gratitude: Gratitude): string {
  return formatItemDate(gratitude.createdAt);
}

/**
 * Meta line for a faithfulness moment card (date only; tags shown as chips).
 * Prefers the user-set "when it happened" day, falling back to when it was
 * recorded.
 */
export function winMetaLine(win: Win): string {
  return formatItemDate(win.occurredAt ?? win.createdAt);
}
