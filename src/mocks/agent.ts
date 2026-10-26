/**
 * MOCK DATA — frontend only. See README.md in this folder.
 * Field tasks, notifications and announcements for the agent space.
 */

import type { TaskStatus } from '../store/localStore';

const daysAgo = (days: number, hour = 9) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const daysAhead = (days: number, hour = 8) => daysAgo(-days, hour);

// ---------------------------------------------------------------------------
// Field tasks: disconnections, reconnections, inspections, meter replacements
// ---------------------------------------------------------------------------

export type MockTaskKind = 'disconnection' | 'reconnection' | 'inspection' | 'meter_replacement';

export type MockTask = {
  id: string;
  reference: string;
  kind: MockTaskKind;
  customerName: string;
  customerCode: string;
  meterNumber: string;
  address: string;
  area: string;
  dueDate: string;
  priority: 'low' | 'normal' | 'high';
  status: TaskStatus;
  amountDue?: number;
  noteKey?: string;
};

export const MOCK_TASKS: MockTask[] = [
  { id: 't-1', reference: 'TSK-0451', kind: 'disconnection', customerName: 'Mahamat Idriss', customerCode: 'CUST-0231', meterNumber: 'MTR-00812', address: 'Rue 3015, porte 12', area: 'Moursal', dueDate: daysAhead(0, 12), priority: 'high', status: 'todo', amountDue: 48500, noteKey: 'mock.task.note.overdue3' },
  { id: 't-2', reference: 'TSK-0452', kind: 'disconnection', customerName: 'Fatimé Zara', customerCode: 'CUST-0188', meterNumber: 'MTR-00644', address: 'Avenue Taiwan, porte 4', area: 'Moursal', dueDate: daysAhead(0, 15), priority: 'normal', status: 'todo', amountDue: 23000, noteKey: 'mock.task.note.overdue2' },
  { id: 't-3', reference: 'TSK-0447', kind: 'reconnection', customerName: 'Abakar Saleh', customerCode: 'CUST-0402', meterNumber: 'MTR-01020', address: 'Rue 4502, porte 7', area: 'Chagoua', dueDate: daysAhead(1, 9), priority: 'high', status: 'in_progress', noteKey: 'mock.task.note.paid' },
  { id: 't-4', reference: 'TSK-0440', kind: 'inspection', customerName: 'Hawa Oumar', customerCode: 'CUST-0355', meterNumber: 'MTR-00930', address: 'Carré 18, porte 2', area: 'Dembé', dueDate: daysAhead(2, 10), priority: 'low', status: 'todo', noteKey: 'mock.task.note.suspectedLeak' },
  { id: 't-5', reference: 'TSK-0431', kind: 'meter_replacement', customerName: 'Youssouf Brahim', customerCode: 'CUST-0120', meterNumber: 'MTR-00511', address: 'Rue 1024, porte 19', area: 'Farcha', dueDate: daysAgo(1, 10), priority: 'normal', status: 'done' },
];

export const TASK_KIND_ICON: Record<MockTaskKind, 'cut-outline' | 'refresh-circle-outline' | 'search-outline' | 'swap-horizontal-outline'> = {
  disconnection: 'cut-outline',
  reconnection: 'refresh-circle-outline',
  inspection: 'search-outline',
  meter_replacement: 'swap-horizontal-outline',
};

// ---------------------------------------------------------------------------
// Notifications & announcements
// ---------------------------------------------------------------------------

export type MockAgentNotification = {
  id: string;
  kind: 'round' | 'rejected' | 'task' | 'system';
  titleKey: string;
  bodyKey: string;
  date: string;
};

export const MOCK_AGENT_NOTIFICATIONS: MockAgentNotification[] = [
  { id: 'an-1', kind: 'round', titleKey: 'mock.agentNotif.roundAssigned.title', bodyKey: 'mock.agentNotif.roundAssigned.body', date: daysAgo(0, 7) },
  { id: 'an-2', kind: 'rejected', titleKey: 'mock.agentNotif.readingRejected.title', bodyKey: 'mock.agentNotif.readingRejected.body', date: daysAgo(1, 16) },
  { id: 'an-3', kind: 'task', titleKey: 'mock.agentNotif.taskAssigned.title', bodyKey: 'mock.agentNotif.taskAssigned.body', date: daysAgo(1, 9) },
  { id: 'an-4', kind: 'system', titleKey: 'mock.agentNotif.maintenance.title', bodyKey: 'mock.agentNotif.maintenance.body', date: daysAgo(6, 18) },
];

export const MOCK_ANNOUNCEMENTS = [
  { id: 'ann-1', titleKey: 'mock.announcement.a1.title', bodyKey: 'mock.announcement.a1.body', date: daysAgo(0, 7) },
  { id: 'ann-2', titleKey: 'mock.announcement.a2.title', bodyKey: 'mock.announcement.a2.body', date: daysAgo(3, 12) },
];

// ---------------------------------------------------------------------------
// Incident report types
// ---------------------------------------------------------------------------

export type MockIncidentType = {
  id: 'leak' | 'brokenMeter' | 'illegalConnection' | 'damagedCover' | 'noWater' | 'other';
  labelKey: string;
  icon: 'water-outline' | 'speedometer-outline' | 'warning-outline' | 'construct-outline' | 'close-circle-outline' | 'ellipsis-horizontal-circle-outline';
};

export const MOCK_INCIDENT_TYPES: MockIncidentType[] = [
  { id: 'leak', labelKey: 'incident.type.leak', icon: 'water-outline' },
  { id: 'brokenMeter', labelKey: 'incident.type.brokenMeter', icon: 'speedometer-outline' },
  { id: 'illegalConnection', labelKey: 'incident.type.illegalConnection', icon: 'warning-outline' },
  { id: 'damagedCover', labelKey: 'incident.type.damagedCover', icon: 'construct-outline' },
  { id: 'noWater', labelKey: 'incident.type.noWater', icon: 'close-circle-outline' },
  { id: 'other', labelKey: 'incident.type.other', icon: 'ellipsis-horizontal-circle-outline' },
];

/** Average minutes per stop, used to estimate the day's route duration. */
export const MOCK_MINUTES_PER_STOP = 12;
