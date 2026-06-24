export type CalendarCell = { day: number; dateString: string } | null;

export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateString(
  year: number,
  monthIndex: number,
  day: number,
): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export type CalendarMonthRef = { year: number; monthIndex: number };

export function addMonths(
  year: number,
  monthIndex: number,
  delta: number,
): CalendarMonthRef {
  const date = new Date(year, monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function monthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function getMonthMatrix(
  year: number,
  monthIndex: number,
): CalendarCell[][] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, dateString: toDateString(year, monthIndex, day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
