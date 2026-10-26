/**
 * Authentication flow configuration.
 *
 * Agents sign in with email + password against the existing backend
 * (POST /api/auth/login — unchanged), then confirm a one-time password from an
 * authenticator app (TOTP). The OTP step is FRONTEND-ONLY for now: there is no
 * backend endpoint yet, so the code is checked locally against MOCK_OTP_CODE.
 *
 * When the backend ships TOTP:
 *   1. replace `verifyOtp` in src/store/authStore.ts with the real call
 *      (e.g. POST /api/auth/otp/verify { code }) and drop MOCK_OTP_CODE;
 *   2. keep AUTH_OTP_ENABLED = true, or flip it to false to fall back to the
 *      plain password flow without touching any screen.
 */
export const AUTH_OTP_ENABLED = true;

/** MOCK — the only code the local verifier accepts while there is no backend. */
export const MOCK_OTP_CODE = '123456';

/** TOTP codes rotate every 30 seconds; drives the countdown on the OTP screen. */
export const OTP_PERIOD_SECONDS = 30;

export const OTP_LENGTH = 6;

/** Simulated network latency for mock submissions, so loading states are visible. */
export const MOCK_LATENCY_MS = 650;
