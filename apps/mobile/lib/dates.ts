/** Local calendar day as YYYY-MM-DD, for comparing against date-only values. */
export function localToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * True when `value` (a YYYY-MM-DD date or full ISO timestamp) falls on or before
 * today's local calendar day. ISO dates sort lexically the same as
 * chronologically, so comparing the date portion as a string is correct and
 * avoids timezone surprises.
 */
export function isTodayOrPast(
  value: string,
  today: string = localToday(),
): boolean {
  return value.slice(0, 10) <= today;
}
