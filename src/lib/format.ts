import { billStatusOf, normalizeStatus, READING_STATUS } from '../services/api';
import type { Tone } from '../components/ui';

type Translate = (key: string, fallback?: any) => string;

/** Localised day/month/year. Falls back to the raw value on unparsable input. */
export const formatDate = (value: any): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

/** "23 oct." style short date for dense rows. */
export const formatDateShort = (value: any, locale?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return date.toLocaleDateString();
  }
};

export const formatTime = (value: any, locale?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return date.toLocaleTimeString();
  }
};

/** "octobre 2026" — the current billing month, capitalised. */
export const formatMonthYear = (value: Date | string | number = new Date(), locale?: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  let label: string;
  try {
    label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  } catch {
    label = date.toLocaleDateString();
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Three-letter month for chart axes. */
export const formatMonthShort = (value: any, locale?: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return date.toLocaleDateString(locale, { month: 'short' }).replace('.', '');
  } catch {
    return date.toLocaleDateString();
  }
};

/** Whole days between now and `value` (negative when in the past). */
export const daysUntil = (value: any): number | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86_400_000);
};

/** Billing period as "month year" — bills are monthly. */
export const formatPeriod = (bill: any): string => {
  const raw = bill?.billingPeriod || bill?.periodStart || bill?.createdAt;
  if (!raw) return '—';
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? String(raw)
    : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

/** Index value with thin-space thousands grouping (Intl is unreliable on Hermes). */
export const formatIndex = (value: any): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  const [whole, fraction] = num.toFixed(fraction_digits(num)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${grouped}.${fraction}` : grouped;
};

const fraction_digits = (num: number) => (Number.isInteger(num) ? 0 : 2);

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const billLabel = (bill: any, t: Translate): string => {
  const status = billStatusOf(bill) || 'UNPAID';
  return t(`bill.${status}`, status);
};

export const billTone = (bill: any): Tone => {
  const status = billStatusOf(bill);
  if (status === 'PAID') return 'success';
  if (status === 'PARTIAL' || status === 'PENDING') return 'warning';
  return 'danger';
};

export const readingLabel = (reading: any, t: Translate): string => {
  const status = normalizeStatus(reading);
  return status ? t(`status.${status}`, status) : '—';
};

export const readingTone = (reading: any): Tone => {
  const status = normalizeStatus(reading);
  if (status === READING_STATUS.APPROVED) return 'success';
  if (status === READING_STATUS.REJECTED) return 'danger';
  if (status === READING_STATUS.PENDING) return 'info';
  return 'warning';
};

/** Icon name for a reading status, used by round rows and history. */
export const readingIcon = (
  reading: any
): 'checkmark-circle' | 'close-circle' | 'time' | 'paper-plane' => {
  const status = normalizeStatus(reading);
  if (status === READING_STATUS.APPROVED) return 'checkmark-circle';
  if (status === READING_STATUS.REJECTED) return 'close-circle';
  if (status === READING_STATUS.PENDING) return 'time';
  return 'paper-plane';
};

export const complaintTone = (status: string): Tone => {
  switch (status) {
    case 'Resolved':
      return 'success';
    case 'Closed':
      return 'neutral';
    case 'In_Progress':
      return 'warning';
    default:
      return 'info';
  }
};

export const taskTone = (status: string): Tone =>
  status === 'done' ? 'success' : status === 'in_progress' ? 'warning' : status === 'blocked' ? 'danger' : 'info';

export const requestTone = (status: string): Tone => {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'PAYMENT_CANCELLED':
      return 'danger';
    case 'PAYMENT_PENDING':
      return 'warning';
    default:
      return 'info';
  }
};
