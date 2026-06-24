const MAX_TITLE_LENGTH = 60;

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
