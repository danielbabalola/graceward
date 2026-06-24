const MAX_TITLE_LENGTH = 60;

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * True when `dateString` (YYYY-MM-DD) is strictly after `today`. The ISO date
 * format sorts lexically the same as chronologically, so a plain string
 * comparison is correct and avoids timezone surprises.
 */
export function isFutureLocalDate(
  dateString: string,
  today: string = toLocalDateString(new Date()),
): boolean {
  return dateString > today;
}

export function deriveTitle(rawText: string): string | null {
  const firstLine = rawText
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return null;
  }

  if (firstLine.length <= MAX_TITLE_LENGTH) {
    return firstLine;
  }

  return `${firstLine.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`;
}
