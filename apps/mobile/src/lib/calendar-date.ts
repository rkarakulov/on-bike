import { t, type MessageKey } from '@on-bike/i18n';

const MONTHS = [
  'date.month.1',
  'date.month.2',
  'date.month.3',
  'date.month.4',
  'date.month.5',
  'date.month.6',
  'date.month.7',
  'date.month.8',
  'date.month.9',
  'date.month.10',
  'date.month.11',
  'date.month.12',
] as const satisfies readonly MessageKey[];

const pad = (value: number) => String(value).padStart(2, '0');

/** `YYYY-MM-DD` из локальных компонентов: пикер отдаёт локальную полночь, `toISOString()` сдвинул бы день. */
export function toCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Локальная полночь календарной даты `YYYY-MM-DD` — значение для пикера. */
export function fromCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** «14 марта 1991». */
export function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return t('date.long', { day, month: t(MONTHS[month - 1]), year });
}
