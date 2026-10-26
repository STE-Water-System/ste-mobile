import { useMemo } from 'react';

import { MOCK_COMPLAINTS, MOCK_REQUESTS, REQUEST_FLOW, type MockTimelineStep } from '../mocks';
import { useLocalStore, type ComplaintStatus, type RequestStatus } from '../store/localStore';
import { useCustomer } from '../store/authStore';

/**
 * Customer records = MOCK rows + rows created on this device by the signed-in
 * customer. Both shapes are normalised here so screens render one list.
 */

export interface ComplaintRecord {
  id: string;
  reference: string;
  subject: string;
  /** Set for mock rows (i18n key); `subject` holds the literal text for local rows. */
  subjectKey?: string;
  description?: string;
  category: string;
  priority: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  timeline: MockTimelineStep[];
  source: 'mock' | 'local';
}

export interface RequestRecord {
  id: string;
  reference: string;
  kind: 'new' | 'extension' | 'transfer';
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  quarter: string;
  street: string;
  amount?: number;
  source: 'mock' | 'local';
  usage?: string;
  fullName?: string;
  phone?: string;
  door?: string;
  landmark?: string;
  notes?: string;
}

const byDateDesc = <T extends { createdAt: string }>(rows: T[]) =>
  [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const useComplaintRecords = (): ComplaintRecord[] => {
  const customer = useCustomer();
  const local = useLocalStore((state) => state.complaints);
  const owner = customer?.customerCode ?? '';

  return useMemo(() => {
    const mine = local
      .filter((row) => row.owner === owner)
      .map<ComplaintRecord>((row) => ({
        id: row.id,
        reference: row.reference,
        subject: row.subject,
        description: row.description,
        category: row.category,
        priority: row.priority,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        timeline: [
          { labelKey: 'mock.timeline.received', date: row.createdAt, state: 'done' },
          { labelKey: 'mock.timeline.inReview', state: 'current' },
          { labelKey: 'mock.timeline.resolved', state: 'pending' },
        ],
        source: 'local',
      }));
    const mocks = MOCK_COMPLAINTS.map<ComplaintRecord>((row) => ({
      id: row.id,
      reference: row.reference,
      subject: '',
      subjectKey: row.subjectKey,
      category: row.category,
      priority: row.priority,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      timeline: row.timeline,
      source: 'mock',
    }));
    return byDateDesc([...mine, ...mocks]);
  }, [local, owner]);
};

export const useRequestRecords = (): RequestRecord[] => {
  const customer = useCustomer();
  const local = useLocalStore((state) => state.installationRequests);
  const owner = customer?.customerCode ?? '';

  return useMemo(() => {
    const mine = local
      .filter((row) => row.owner === owner)
      .map<RequestRecord>((row) => ({
        id: row.id,
        reference: row.reference,
        kind: row.kind,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.createdAt,
        quarter: row.quarter,
        street: row.street,
        source: 'local',
        usage: row.usage,
        fullName: row.fullName,
        phone: row.phone,
        door: row.door,
        landmark: row.landmark,
        notes: row.notes,
      }));
    const mocks = MOCK_REQUESTS.map<RequestRecord>((row) => ({ ...row, source: 'mock' }));
    return byDateDesc([...mine, ...mocks]);
  }, [local, owner]);
};

/** Timeline steps for a request, derived from where its status sits in the flow. */
export const requestTimeline = (status: RequestStatus, createdAt: string, updatedAt: string): MockTimelineStep[] => {
  const position = Math.max(0, REQUEST_FLOW.indexOf(status));
  return REQUEST_FLOW.map((step, index) => ({
    labelKey: `requestStatus.${step}`,
    date: index === 0 ? createdAt : index === position ? updatedAt : undefined,
    state: index < position ? 'done' : index === position ? (status === 'COMPLETED' ? 'done' : 'current') : 'pending',
  }));
};
