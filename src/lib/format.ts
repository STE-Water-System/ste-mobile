import { billStatusOf, normalizeStatus, READING_STATUS } from '../services/api';
import type { Tone } from '../components/ui';

type Translate = (key: string, fallback?: any) => string;

/** Localised day/month/year. Falls back to the raw value on unparsable input. */
export const formatDate = (value: any): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
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

export const billLabel = (bill: any, t: Translate): string => {
  const status = billStatusOf(bill) || 'UNPAID';
  return t(`bill.${status}`, status);
};

export const billTone = (bill: any): Tone => {
  const status = billStatusOf(bill);
  if (status === 'PAID') return 'success';
  if (status === 'PARTIAL') return 'warning';
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
  return 'warning';
};
