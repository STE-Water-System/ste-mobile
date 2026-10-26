# Dependency upgrade — Expo SDK 57 → 58 (October 2026)

## What changed

| Package | Before | After |
|---|---|---|
| expo | 57.0.14 | 58.0.17 |
| react-native | 0.86.2 | 0.88.0 |
| react / react-dom | 19.2.3 | 19.3.0 |
| expo-router | 57.0.14 | 58.0.25 |
| react-native-reanimated / worklets | 4.5.1 / 0.10.1 | 4.7.1 / 0.13.0 |
| react-native-screens | 4.26 | 4.30 |
| react-native-safe-area-context | 5.7 | 5.10 |
| @tanstack/react-query | 5.90 | 5.104 |
| i18next / react-i18next | 25.7 / 16.3 | 26.5 / 17.1 |
| zustand | 5.0.8 | 5.0.16 |
| typescript | 5.9 (pinned down by hand) | 6.0 (Expo's expected range) |
| new: expo-linear-gradient, expo-haptics | — | 58.x |

Kept on purpose: `@react-native-async-storage/async-storage` stays on 2.2.0. Version 3 replaces the
global API with scoped storage instances and renames the `multi*` methods, which would touch the
token/session storage used by the existing backend integration. Upgrade it separately when that
code is next revisited.

## Breaking changes resolved

1. **expo-router 58 custom tab bar props** — a custom `tabBar` now receives
   `{ state, descriptors, emitter, navigateToTab, insets }` instead of a `navigation` object.
   `src/components/TabBar.tsx` uses `emitter.emit` + `navigateToTab(routeKey)` (with a fallback to
   the old shape). Without this, every tab press threw `Cannot read properties of undefined (reading 'emit')`.
2. **React Native 0.88 strict types** — `RefreshControl.onRefresh` must return `void | Promise<void>`,
   so `() => query.refetch()` no longer type-checks. `Screen` wraps the handler. `useRef<TextInput>`
   is no longer the instance type; use `React.ComponentRef<typeof TextInput>`.
3. **npm peer resolution** — expo-router 58 declares an optional peer on `@expo/ui` that npm 10 fails
   to resolve. `.npmrc` sets `legacy-peer-deps=true`; keep it.
4. **iOS scene lifecycle** — SDK 58 prebuild generates `SceneDelegate.swift`. `ios/` was regenerated
   with `npx expo prebuild --platform ios --clean`; pods install cleanly (119 pods).
5. **i18next 26 / react-i18next 17** — no code changes needed: the app never used `initImmediate`,
   the legacy `interpolation.format`, or `<Trans>`.

## Verified

- `npx tsc --noEmit`: clean.
- `npx expo start --web`: both spaces exercised end to end against a local API (login, OTP, agent
  home / round / reading form / tasks / route / incident / profile; customer home / bills / usage /
  services / pay / installation / verification / complaints).
- Native iOS build: **blocked on this machine** — Xcode 26.6 reports *"iOS 26.5 is not installed"*
  and lists no simulator destination. Install the iOS platform from Xcode › Settings › Components
  (or `xcodebuild -downloadPlatform iOS`), then `npx expo run:ios --port 8082`.
