import { format } from 'date-fns';

export function formatDate(value: string | number | Date | null | undefined, pattern: string, fallback = '-'): string {
  if (!value) return fallback;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return format(date, pattern);
}
