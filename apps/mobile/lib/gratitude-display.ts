import type { Gratitude, Win } from "@graceward/shared";

export function formatItemDate(value: string): string {
  const parsed = new Date(value);
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

export function gratitudeMetaLine(gratitude: Gratitude): string {
  const date = formatItemDate(gratitude.createdAt);
  const category = gratitude.category?.trim();
  return category ? `${date} · ${category}` : date;
}

export function winMetaLine(win: Win): string {
  const date = formatItemDate(win.createdAt);
  const theme = win.faithfulnessTheme?.trim();
  return theme ? `${date} · ${theme}` : date;
}
