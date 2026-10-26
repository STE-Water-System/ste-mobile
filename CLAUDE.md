# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Expo field app for the STE water-management system with two user spaces: **agent** (meter readers
completing their monthly round in the field) and **client** (customers checking bills, consumption, and
making self-service requests). Admins use the web back-office and are refused here. See `../CLAUDE.md`
for the API contracts this app depends on.

## Commands

```bash
npx expo start --port 8082     # Metro (8081 is often taken by another project on this machine)
npx expo start --web --port 8082
npx expo run:ios               # native iOS build + simulator (ios/ is generated; CocoaPods required)
npx expo run:android
npx tsc --noEmit               # type-check (strict); no lint or test setup exists
```

Stack: Expo SDK 58 / React Native 0.88 / React 19.3 / expo-router 58 / Reanimated 4.7 / TypeScript 6.
`.npmrc` sets `legacy-peer-deps=true` because expo-router 58 declares an optional peer on `@expo/ui`
that npm otherwise refuses to resolve; keep it or `npm install` fails.

`.env` sets `EXPO_PUBLIC_API_BASE_URL` (iOS simulator: `http://localhost:8000/api`, Android emulator:
`http://10.0.2.2:8000/api`, device: machine IP) and `EXPO_PUBLIC_USE_RN_FETCH`. Keep the native fetch for
FormData uploads: Expo's WinterCG fetch cannot send React Native `{ uri, name, type }` file parts.
`app.json` whitelists the API's cleartext IP under `NSExceptionDomains`; add new HTTP hosts there.
When testing on web against a local API, the API must allow `http://localhost:8082` in `CORS_ORIGIN`.

## Architecture

**Routing (expo-router, `src/app`):** `index.tsx` is the entry gate: waits for `hydrated`, then redirects
by session kind to `/(agent)/(tabs)/home`, `/(client)/(tabs)/home` or `/(auth)/login`. Each space is a
`Stack` (`(agent)/_layout.tsx`, `(client)/_layout.tsx`) that redirects to `/` when the session kind does
not match, with a nested `(tabs)` group rendered through the custom `components/TabBar.tsx`. Detail
screens (`(agent)/reading/[code]`, `(agent)/task/[id]`, `(client)/bill/[id]`, …) are pushed on the stack.
`reading-details.tsx` at the root is shared history detail. Screens never check auth themselves.

**Auth:** `src/store/authStore.ts` (zustand). Agents: `POST /auth/login` (unchanged) parks the account in
`pendingAgent`, then `(auth)/otp.tsx` confirms a TOTP code. The OTP check is **frontend-only**: see
`src/config/auth.ts` (`AUTH_OTP_ENABLED`, `MOCK_OTP_CODE`); `verifyOtp` is the single function to replace
with the backend call. `hydrate()` refuses a stored agent token without the `agent_otp_verified` flag.
Clients: `POST /client/verify-customer` (unchanged), persisted under `client_session`, no JWT.

**Backend calls** all live in `src/services/api.ts` and are unchanged by the redesign: assigned round
(`meterApi.getAssignedRound`), customer lookup, `loadCustomerForReading` / `updateReading`
(PUT multipart, status derived server-side), bills, consumption, complaint creation. Query keys are
centralised in `src/hooks/useAgentRound.ts` and `src/hooks/useClientData.ts`.

**Frontend-only features (no endpoint yet):** OTP, agent interventions/tasks, incident reports, route
estimate, customer mock payment, installation requests, complaints list, verification lookup,
self-readings, outages, agencies, notifications. Datasets are in `src/mocks/` (see its README for what
each stands in for) and user-created records persist in `src/store/localStore.ts`, tagged with the
owning account. Screens that use them show the `MockBanner` ribbon.

**UI kit:** `src/theme/index.ts` tokens (colors, gradients, radius, `spacing(n)`, Inter `type` scale,
shadows, RTL helpers `textStart/textEnd/chevronBack`), `src/components/ui.tsx` primitives (Screen,
Header, Card, Field, Button, Badge, Chip, Segmented, Notice, Empty, Sheet, MockBanner),
`src/components/blocks.tsx` composites (Hero, StatCard, Tile, ListRow, Avatar, ProgressBar, Skeleton,
Stepper, Timeline, OtpInput, Toggle), `src/components/charts.tsx` (view-based BarChart) and
`src/components/motion.tsx` (`Tap` press-scale + haptics, `Appear` staggered entrance). Status →
label/tone/icon mapping is in `src/lib/format.ts`; round statistics in `src/lib/round.ts`.

**i18n:** `fr`, `ar`, `en` in `src/i18n/locales/` with identical key sets (mock content is keyed under
`mock.*`); language follows the device with French fallback and there is no in-app switcher. Add keys
to all three files.

## Known state

- Native iOS builds need the iOS 26.5 platform component in Xcode 26.6 (Xcode › Settings › Components);
  without it xcodebuild finds no simulator destination.
- `ios/` is a generated prebuild output and is gitignored (`/ios`, `/android`); regenerate with
  `npx expo prebuild --platform ios --clean` after native dependency changes.
- `clientApi`/`complaintsApi` comments describe backend bugs (e.g. complaint `status: 'PENDING'` vs the
  ENUM) that must be fixed in STE-API, not worked around here.
