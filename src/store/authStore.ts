import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, clientApi, clearAuthData, getStoredUser, ApiError } from '../services/api';

const CLIENT_SESSION_KEY = 'client_session';

export interface AgentUser {
  id: number;
  name: string;
  email: string;
  userType?: string;
  role?: { id: number; name: string };
}

export interface ClientSession {
  customerId: number;
  customerCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  category?: string;
  address?: any;
  meters: any[];
}

export type Session =
  | { kind: 'agent'; agent: AgentUser }
  | { kind: 'client'; customer: ClientSession }
  | null;

const roleNameOf = (user: any): string =>
  String(user?.role?.name || user?.userType || '').trim().toUpperCase();

interface AuthState {
  session: Session;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  loginAgent: (email: string, password: string) => Promise<void>;
  loginClient: (customerCode: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  hydrated: false,

  /** Restore whichever session was left behind on the device. */
  hydrate: async () => {
    try {
      const agent = await getStoredUser();
      if (agent) {
        set({ session: { kind: 'agent', agent }, hydrated: true });
        return;
      }

      const stored = await AsyncStorage.getItem(CLIENT_SESSION_KEY);
      if (stored) {
        set({ session: { kind: 'client', customer: JSON.parse(stored) }, hydrated: true });
        return;
      }
    } catch (error) {
      console.warn('Could not restore session:', error);
    }
    set({ hydrated: true });
  },

  loginAgent: async (email, password) => {
    const data = await authApi.login(email, password);

    // The mobile app is a field tool: administrators use the web back-office.
    if (roleNameOf(data.user) === 'ADMIN') {
      await clearAuthData();
      throw new ApiError('Ce compte administrateur n’a pas accès à l’application mobile.', 403);
    }

    set({ session: { kind: 'agent', agent: data.user } });
  },

  loginClient: async (customerCode, phone) => {
    const customer = await clientApi.verifyCustomer(customerCode, phone);
    await AsyncStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(customer));
    set({ session: { kind: 'client', customer } });
  },

  logout: async () => {
    const { session } = get();
    try {
      if (session?.kind === 'agent') await authApi.logout();
    } catch (error) {
      console.warn('Logout call failed:', error);
    } finally {
      await AsyncStorage.removeItem(CLIENT_SESSION_KEY);
      await clearAuthData();
      set({ session: null });
    }
  },
}));

export const useSession = () => useAuthStore((state) => state.session);

export const useAgent = () =>
  useAuthStore((state) => (state.session?.kind === 'agent' ? state.session.agent : null));

export const useCustomer = () =>
  useAuthStore((state) => (state.session?.kind === 'client' ? state.session.customer : null));
