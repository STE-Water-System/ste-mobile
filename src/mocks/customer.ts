/**
 * MOCK DATA — frontend only. See README.md in this folder.
 * Text is referenced by i18n key so the demo content follows the app language.
 */

import type { ComplaintStatus, RequestStatus } from '../store/localStore';
import { MOCK_LATENCY_MS } from '../config/auth';

export const MOCK = true;

/** Simulated network round-trip for mock submissions. */
export const mockDelay = (ms: number = MOCK_LATENCY_MS) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const daysAgo = (days: number, hour = 9) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const daysAhead = (days: number, hour = 8) => daysAgo(-days, hour);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type MockNotification = {
  id: string;
  kind: 'bill' | 'outage' | 'complaint' | 'payment' | 'info';
  titleKey: string;
  bodyKey: string;
  date: string;
};

export const MOCK_CLIENT_NOTIFICATIONS: MockNotification[] = [
  { id: 'cn-1', kind: 'bill', titleKey: 'mock.notif.billReady.title', bodyKey: 'mock.notif.billReady.body', date: daysAgo(1, 10) },
  { id: 'cn-2', kind: 'outage', titleKey: 'mock.notif.outage.title', bodyKey: 'mock.notif.outage.body', date: daysAgo(2, 16) },
  { id: 'cn-3', kind: 'complaint', titleKey: 'mock.notif.complaintUpdate.title', bodyKey: 'mock.notif.complaintUpdate.body', date: daysAgo(4, 11) },
  { id: 'cn-4', kind: 'payment', titleKey: 'mock.notif.paymentReceived.title', bodyKey: 'mock.notif.paymentReceived.body', date: daysAgo(12, 14) },
  { id: 'cn-5', kind: 'info', titleKey: 'mock.notif.tip.title', bodyKey: 'mock.notif.tip.body', date: daysAgo(20, 9) },
];

// ---------------------------------------------------------------------------
// Outages / planned works
// ---------------------------------------------------------------------------

export type MockOutage = {
  id: string;
  area: string;
  titleKey: string;
  bodyKey: string;
  start: string;
  end: string;
  status: 'planned' | 'ongoing' | 'resolved';
};

export const MOCK_OUTAGES: MockOutage[] = [
  { id: 'out-1', area: 'Moursal', titleKey: 'mock.outage.moursal.title', bodyKey: 'mock.outage.moursal.body', start: daysAhead(2, 8), end: daysAhead(2, 14), status: 'planned' },
  { id: 'out-2', area: 'Farcha', titleKey: 'mock.outage.farcha.title', bodyKey: 'mock.outage.farcha.body', start: daysAgo(0, 6), end: daysAhead(0, 18), status: 'ongoing' },
  { id: 'out-3', area: 'Chagoua', titleKey: 'mock.outage.chagoua.title', bodyKey: 'mock.outage.chagoua.body', start: daysAgo(6, 7), end: daysAgo(6, 12), status: 'resolved' },
];

// ---------------------------------------------------------------------------
// Complaints ("plaintes") — statuses mirror the backend ENUM on `complains.status`
// ---------------------------------------------------------------------------

export type MockTimelineStep = { labelKey: string; date?: string; state: 'done' | 'current' | 'pending' };

export type MockComplaint = {
  id: string;
  reference: string;
  subjectKey: string;
  category: 'Technical' | 'Billing' | 'Service' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  timeline: MockTimelineStep[];
};

export const MOCK_COMPLAINTS: MockComplaint[] = [
  {
    id: 'mc-1',
    reference: 'REC-2026-0117',
    subjectKey: 'mock.complaint.c1.subject',
    category: 'Technical',
    priority: 'High',
    status: 'In_Progress',
    createdAt: daysAgo(5, 8),
    updatedAt: daysAgo(3, 15),
    timeline: [
      { labelKey: 'mock.timeline.received', date: daysAgo(5, 8), state: 'done' },
      { labelKey: 'mock.timeline.inReview', date: daysAgo(4, 10), state: 'done' },
      { labelKey: 'mock.timeline.technicianAssigned', date: daysAgo(3, 15), state: 'current' },
      { labelKey: 'mock.timeline.resolved', state: 'pending' },
    ],
  },
  {
    id: 'mc-2',
    reference: 'REC-2026-0098',
    subjectKey: 'mock.complaint.c2.subject',
    category: 'Billing',
    priority: 'Medium',
    status: 'Resolved',
    createdAt: daysAgo(21, 9),
    updatedAt: daysAgo(14, 11),
    timeline: [
      { labelKey: 'mock.timeline.received', date: daysAgo(21, 9), state: 'done' },
      { labelKey: 'mock.timeline.inReview', date: daysAgo(19, 10), state: 'done' },
      { labelKey: 'mock.timeline.resolved', date: daysAgo(14, 11), state: 'done' },
    ],
  },
  {
    id: 'mc-3',
    reference: 'REC-2026-0061',
    subjectKey: 'mock.complaint.c3.subject',
    category: 'Service',
    priority: 'Low',
    status: 'Closed',
    createdAt: daysAgo(48, 9),
    updatedAt: daysAgo(40, 16),
    timeline: [
      { labelKey: 'mock.timeline.received', date: daysAgo(48, 9), state: 'done' },
      { labelKey: 'mock.timeline.resolved', date: daysAgo(42, 12), state: 'done' },
      { labelKey: 'mock.timeline.closed', date: daysAgo(40, 16), state: 'done' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Installation / connection requests — statuses mirror ConnectionRequestStatus
// ---------------------------------------------------------------------------

export type MockRequest = {
  id: string;
  reference: string;
  kind: 'new' | 'extension' | 'transfer';
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  quarter: string;
  street: string;
  amount?: number;
};

export const MOCK_REQUESTS: MockRequest[] = [
  {
    id: 'mr-1',
    reference: 'DEM-2026-0031',
    kind: 'new',
    status: 'VERIFICATION',
    createdAt: daysAgo(9, 10),
    updatedAt: daysAgo(7, 9),
    quarter: 'Dembé',
    street: 'Rue 4021',
    amount: 85000,
  },
  {
    id: 'mr-2',
    reference: 'DEM-2026-0012',
    kind: 'extension',
    status: 'COMPLETED',
    createdAt: daysAgo(60, 10),
    updatedAt: daysAgo(31, 9),
    quarter: 'Klémat',
    street: 'Avenue Mobutu',
    amount: 120000,
  },
];

/** The order a connection request moves through, for the tracking timeline. */
export const REQUEST_FLOW: RequestStatus[] = [
  'OPEN',
  'VERIFICATION',
  'PAYMENT_PENDING',
  'PAYMENT_COLLECTED',
  'INSTALLATION_PENDING',
  'COMPLETED',
];

// ---------------------------------------------------------------------------
// Agencies & contact
// ---------------------------------------------------------------------------

export type MockAgency = {
  id: string;
  name: string;
  district: string;
  address: string;
  phone: string;
  hoursKey: string;
};

export const MOCK_AGENCIES: MockAgency[] = [
  { id: 'ag-1', name: 'Agence Centrale', district: 'Centre', address: 'Avenue Charles de Gaulle', phone: '+235 22 00 00 01', hoursKey: 'mock.agency.hours.standard' },
  { id: 'ag-2', name: 'Agence Moursal', district: 'Moursal', address: 'Rue de Moursal, face au marché', phone: '+235 22 00 00 02', hoursKey: 'mock.agency.hours.standard' },
  { id: 'ag-3', name: 'Agence Farcha', district: 'Farcha', address: 'Route de Farcha, carrefour', phone: '+235 22 00 00 03', hoursKey: 'mock.agency.hours.extended' },
  { id: 'ag-4', name: 'Agence Dembé', district: 'Dembé', address: 'Rond-point Dembé', phone: '+235 22 00 00 04', hoursKey: 'mock.agency.hours.standard' },
];

export const MOCK_CONTACT = {
  hotline: '+235 22 00 00 00',
  whatsapp: '+235 60 00 00 00',
  email: 'clientele@ste.td',
};

// ---------------------------------------------------------------------------
// Payment methods (mock flow — no gateway integration yet)
// ---------------------------------------------------------------------------

export type MockPaymentMethod = {
  id: 'airtel' | 'moov' | 'card' | 'agency';
  labelKey: string;
  descriptionKey: string;
  icon: 'phone-portrait-outline' | 'card-outline' | 'business-outline';
  requiresPhone: boolean;
};

export const MOCK_PAYMENT_METHODS: MockPaymentMethod[] = [
  { id: 'airtel', labelKey: 'pay.method.airtel', descriptionKey: 'pay.method.airtelDesc', icon: 'phone-portrait-outline', requiresPhone: true },
  { id: 'moov', labelKey: 'pay.method.moov', descriptionKey: 'pay.method.moovDesc', icon: 'phone-portrait-outline', requiresPhone: true },
  { id: 'card', labelKey: 'pay.method.card', descriptionKey: 'pay.method.cardDesc', icon: 'card-outline', requiresPhone: false },
  { id: 'agency', labelKey: 'pay.method.agency', descriptionKey: 'pay.method.agencyDesc', icon: 'business-outline', requiresPhone: false },
];

// ---------------------------------------------------------------------------
// Water-saving tips
// ---------------------------------------------------------------------------

export const MOCK_TIPS = [
  { id: 'tip-1', titleKey: 'mock.tip.t1.title', bodyKey: 'mock.tip.t1.body', icon: 'water-outline' as const },
  { id: 'tip-2', titleKey: 'mock.tip.t2.title', bodyKey: 'mock.tip.t2.body', icon: 'search-outline' as const },
  { id: 'tip-3', titleKey: 'mock.tip.t3.title', bodyKey: 'mock.tip.t3.body', icon: 'speedometer-outline' as const },
  { id: 'tip-4', titleKey: 'mock.tip.t4.title', bodyKey: 'mock.tip.t4.body', icon: 'leaf-outline' as const },
];
