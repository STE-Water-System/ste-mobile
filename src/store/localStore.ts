import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * FRONTEND-ONLY persistence for the features that have no backend endpoint yet
 * (customer self-service requests, mock payments, agent incident reports,
 * notification read state, settings). Everything here lives in AsyncStorage on
 * the device and is clearly a stand-in: when the API ships, replace each
 * `add*` action with the corresponding call in src/services/api.ts and drop the
 * persisted slice.
 */

export type ComplaintStatus = 'Open' | 'In_Progress' | 'Resolved' | 'Closed';
export type RequestStatus =
  | 'OPEN'
  | 'VERIFICATION'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COLLECTED'
  | 'INSTALLATION_PENDING'
  | 'COMPLETED';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

/** Records are tagged with the account that created them so another user on the same device never sees them. */
interface Owned {
  owner: string;
}

export interface LocalComplaint extends Owned {
  id: string;
  reference: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  /** Local rows were created on this device; `synced` ones also reached the backend. */
  origin: 'local' | 'synced';
}

export interface LocalInstallationRequest extends Owned {
  id: string;
  reference: string;
  kind: 'new' | 'extension' | 'transfer';
  usage: 'private' | 'public' | 'borne_fontaine';
  status: RequestStatus;
  fullName: string;
  phone: string;
  quarter: string;
  street: string;
  door: string;
  landmark: string;
  notes: string;
  createdAt: string;
}

export interface LocalSelfReading extends Owned {
  id: string;
  reference: string;
  meterId: number;
  meterNumber: string;
  index: number;
  photoUri?: string;
  createdAt: string;
}

export interface LocalPayment extends Owned {
  id: string;
  reference: string;
  billId: string;
  amount: number;
  method: string;
  phone?: string;
  createdAt: string;
}

export interface LocalIncident extends Owned {
  id: string;
  reference: string;
  type: string;
  description: string;
  customerCode?: string;
  meterNumber?: string;
  photoUri?: string;
  latitude?: string;
  longitude?: string;
  createdAt: string;
}

interface LocalState {
  complaints: LocalComplaint[];
  addComplaint: (complaint: LocalComplaint) => void;

  installationRequests: LocalInstallationRequest[];
  addInstallationRequest: (request: LocalInstallationRequest) => void;

  selfReadings: LocalSelfReading[];
  addSelfReading: (reading: LocalSelfReading) => void;

  payments: LocalPayment[];
  addPayment: (payment: LocalPayment) => void;

  incidents: LocalIncident[];
  addIncident: (incident: LocalIncident) => void;

  taskStatus: Record<string, TaskStatus>;
  setTaskStatus: (id: string, status: TaskStatus) => void;

  readNotifications: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;

  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;

  lastSyncAt: string | null;
  touchSync: () => void;

  /** Wipes every frontend-only record (used on sign-out of the customer space). */
  reset: () => void;
}

const initial = {
  complaints: [] as LocalComplaint[],
  installationRequests: [] as LocalInstallationRequest[],
  selfReadings: [] as LocalSelfReading[],
  payments: [] as LocalPayment[],
  incidents: [] as LocalIncident[],
  taskStatus: {} as Record<string, TaskStatus>,
  readNotifications: [] as string[],
  notificationsEnabled: true,
  lastSyncAt: null as string | null,
};

export const useLocalStore = create<LocalState>()(
  persist(
    (set) => ({
      ...initial,

      addComplaint: (complaint) =>
        set((state) => ({ complaints: [complaint, ...state.complaints] })),
      addInstallationRequest: (request) =>
        set((state) => ({ installationRequests: [request, ...state.installationRequests] })),
      addSelfReading: (reading) =>
        set((state) => ({ selfReadings: [reading, ...state.selfReadings] })),
      addPayment: (payment) => set((state) => ({ payments: [payment, ...state.payments] })),
      addIncident: (incident) => set((state) => ({ incidents: [incident, ...state.incidents] })),
      setTaskStatus: (id, status) =>
        set((state) => ({ taskStatus: { ...state.taskStatus, [id]: status } })),
      markRead: (id) =>
        set((state) =>
          state.readNotifications.includes(id)
            ? state
            : { readNotifications: [...state.readNotifications, id] }
        ),
      markAllRead: (ids) =>
        set((state) => ({
          readNotifications: Array.from(new Set([...state.readNotifications, ...ids])),
        })),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
      touchSync: () => set({ lastSyncAt: new Date().toISOString() }),
      reset: () => set({ ...initial }),
    }),
    {
      name: 'ste-local-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
