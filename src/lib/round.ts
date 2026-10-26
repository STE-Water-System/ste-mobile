import {
  customerOf,
  formatAddress,
  isApprovedStatus,
  isAwaitingValidation,
  isEditableStatus,
  isRejectedStatus,
  normalizeStatus,
  READING_STATUS,
} from '../services/api';

/**
 * Derived views over the agent's assigned round (GET /api/meter-readings,
 * unchanged). Everything on the agent home and round screens is computed from
 * the rows the backend already returns, so no new endpoint is needed.
 */

export interface RoundStats {
  total: number;
  /** PENDING — fresh assignments not yet recorded. */
  pending: number;
  /** REJECTED — sent back by the validator, to correct. */
  rejected: number;
  /** SUBMITTED / RE_SUBMITED — with the validator. */
  sent: number;
  approved: number;
  /** Rows the agent no longer has to touch: sent + approved. */
  done: number;
  /** 0..1 share of the round that is done. */
  progress: number;
}

export const roundStats = (items: any[]): RoundStats => {
  const total = items.length;
  const pending = items.filter((row) => normalizeStatus(row) === READING_STATUS.PENDING).length;
  const rejected = items.filter(isRejectedStatus).length;
  const sent = items.filter(isAwaitingValidation).length;
  const approved = items.filter(isApprovedStatus).length;
  const done = sent + approved;
  return { total, pending, rejected, sent, approved, done, progress: total ? done / total : 0 };
};

export type RoundFilter = 'all' | 'todo' | 'rejected' | 'sent' | 'approved';

export const filterRound = (items: any[], filter: RoundFilter): any[] => {
  switch (filter) {
    case 'todo':
      return items.filter(isEditableStatus);
    case 'rejected':
      return items.filter(isRejectedStatus);
    case 'sent':
      return items.filter(isAwaitingValidation);
    case 'approved':
      return items.filter(isApprovedStatus);
    default:
      return items;
  }
};

/** Area / centre / city name, whichever the address relation carries. */
export const areaOf = (row: any): string => {
  const address = customerOf(row)?.address;
  return (
    address?.area?.name ||
    address?.area?.areaName ||
    address?.center?.name ||
    address?.center?.centerName ||
    address?.district?.name ||
    address?.district?.districtName ||
    address?.city?.cityName ||
    address?.city?.name ||
    ''
  );
};

export const addressLineOf = (row: any): string => formatAddress(customerOf(row)?.address);

export const meterNumberOf = (row: any): string =>
  String(row?.meter?.meterNumber || row?.meterNumber || '');

/** Group rows by area, keeping the incoming order inside each group. */
export const groupByArea = (items: any[]): { area: string; rows: any[] }[] => {
  const groups = new Map<string, any[]>();
  items.forEach((row) => {
    const key = areaOf(row) || '—';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  });
  return Array.from(groups.entries()).map(([area, rows]) => ({ area, rows }));
};
