/** Dates and file sizes. English-only site (D3), so the locale is fixed. */

const LOCALE = 'en-GB';

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** `24–26 Apr 2026` for a range inside one month, `28 Apr – 2 May 2026` across two. */
export function formatDateRange(start: Date, end?: Date): string {
  if (!end || start.getTime() === end.getTime()) return formatDate(start);
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) return `${start.getUTCDate()}–${formatDate(end)}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatYear(date: Date): string {
  return String(date.getUTCFullYear());
}

/**
 * "11.4 MB". Decimal units, matching what an operating system shows a visitor about to download
 * the file (04-media.md §A4 — the lightbox states the size before the tap).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['kB', 'MB', 'GB'];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** `spring` → `Spring`. Used for semester and status labels. */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** `2024 · Fall` — the meta line on a project row (06 §4). */
export function formatTerm(year: number, semester?: string): string {
  return semester ? `${year} · ${titleCase(semester)}` : String(year);
}

export const STATUS_LABELS = {
  idea: 'Idea',
  'in-progress': 'In progress',
  completed: 'Completed',
  archived: 'Archived',
} as const;
