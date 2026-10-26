import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authApi, clientApi, clearAuthData, getStoredUser, ApiError } from '../services/api';
import { AUTH_OTP_ENABLED, MOCK_LATENCY_MS, MOCK_OTP_CODE, OTP_LENGTH } from '../config/auth';
import i18n from '../i18n';

const CLIENT_SESSION_KEY = 'client_session';
/** Set once the one-time code has been confirmed for the stored agent account. */
const OTP_VERIFIED_KEY = 'agent_otp_verified';

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
  /** Agent whose password was accepted and who still has to confirm the one-time code. */
  pendingAgent: AgentUser | null;
  hydrate: () => Promise<void>;
  loginAgent: (email: string, password: string) => Promise<void>;
  loginClient: (customerCode: string, phone: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  cancelOtp: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  hydrated: false,
  pendingAgent: null,

  /** Restore whichever session was left behind on the device. */
  hydrate: async () => {
    try {
      const agent = await getStoredUser();
      if (agent) {
        const verified =
          !AUTH_OTP_ENABLED || (await AsyncStorage.getItem(OTP_VERIFIED_KEY)) === '1';
        if (verified) {
          set({ session: { kind: 'agent', agent }, hydrated: true });
          return;
        }
        // Password accepted but the code never confirmed (app closed mid sign-in):
        // drop the half-open session and start over.
        await clearAuthData();
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

  /** Step 1 — unchanged backend call (POST /api/auth/login). */
  loginAgent: async (email, password) => {
    const data = await authApi.login(email, password);

    // The mobile app is a field tool: administrators use the web back-office.
    if (roleNameOf(data.user) === 'ADMIN') {
      await clearAuthData();
      throw new ApiError(i18n.t('auth.adminBlocked'), 403);
    }

    if (AUTH_OTP_ENABLED) {
      // Park the account until the second factor is confirmed. The token is
      // already stored by authApi.login; hydrate() refuses it without the flag.
      await AsyncStorage.removeItem(OTP_VERIFIED_KEY);
      set({ pendingAgent: data.user });
      return;
    }

    set({ session: { kind: 'agent', agent: data.user } });
  },

  /**
   * Step 2 — one-time code from the authenticator app.
   * FRONTEND-ONLY for now: the code is compared locally with MOCK_OTP_CODE.
   * Replace the body with the backend verification call when it exists.
   */
  verifyOtp: async (code) => {
    const { pendingAgent } = get();
    if (!pendingAgent) throw new ApiError(i18n.t('otp.expired'), 400);

    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    const accepted = code.length === OTP_LENGTH && code === MOCK_OTP_CODE;
    if (!accepted) throw new ApiError(i18n.t('otp.invalid'), 401);

    await AsyncStorage.setItem(OTP_VERIFIED_KEY, '1');
    set({ session: { kind: 'agent', agent: pendingAgent }, pendingAgent: null });
  },

  /** Leaving the OTP screen abandons the half-open sign-in. */
  cancelOtp: async () => {
    await clearAuthData();
    set({ pendingAgent: null });
  },

  loginClient: async (customerCode, phone) => {
    // Customers type their code and number in free form; the API matches on the
    // national digits, so trim both and keep only digits (and a leading +) here.
    const code = String(customerCode || '').trim().toUpperCase();
    const digits = String(phone || '').trim().replace(/[^\d+]/g, '');
    const customer = await clientApi.verifyCustomer(code, digits);
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
      await AsyncStorage.multiRemove([CLIENT_SESSION_KEY, OTP_VERIFIED_KEY]);
      await clearAuthData();
      set({ session: null, pendingAgent: null });
    }
  },
}));

export const useSession = () => useAuthStore((state) => state.session);

export const useAgent = () =>
  useAuthStore((state) => (state.session?.kind === 'agent' ? state.session.agent : null));

export const useCustomer = () =>
  useAuthStore((state) => (state.session?.kind === 'client' ? state.session.customer : null));
