import type { PrayerRequest, PrayerRequestStatus } from "@graceward/shared";

const statusLabels: Record<PrayerRequestStatus, string> = {
  active: "Active",
  answered: "Answered",
  archived: "Archived",
};

export function prayerStatusLabel(status: PrayerRequestStatus): string {
  return statusLabels[status] ?? status;
}

/**
 * Formats either a date-only string (YYYY-MM-DD) or a full ISO timestamp into a
 * calm, readable date. Returns null for empty/invalid input.
 */
export function formatPrayerDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(isDateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Validates a YYYY-MM-DD string represents a real calendar date. */
export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  // Guard against rollovers like 2026-02-31 becoming March.
  const [year, month, day] = value.split("-").map(Number);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  );
}

const MAX_PREVIEW_LENGTH = 120;

export function prayerPreview(request: PrayerRequest): string {
  const description = request.description?.trim();
  if (!description) {
    return "No details added.";
  }
  const firstLine = description.split("\n")[0]?.trim() ?? description;
  if (firstLine.length <= MAX_PREVIEW_LENGTH) {
    return firstLine;
  }
  return `${firstLine.slice(0, MAX_PREVIEW_LENGTH).trimEnd()}…`;
}

/** Builds a calm secondary line describing status + relevant date. */
export function prayerMetaLine(request: PrayerRequest): string {
  const status = prayerStatusLabel(request.status);
  if (request.status === "answered") {
    const date = formatPrayerDate(request.answeredAt);
    return date ? `${status} · ${date}` : status;
  }
  if (request.status === "active") {
    const date = formatPrayerDate(request.followUpAt);
    return date ? `${status} · Follow up ${date}` : status;
  }
  return status;
}
