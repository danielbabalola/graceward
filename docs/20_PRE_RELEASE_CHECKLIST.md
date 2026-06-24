# 20 Pre-Release Checklist

Practical readiness pass for an iOS development/TestFlight build of the Graceward
MVP. This is a config/verification checklist, not a feature list. Run it before
cutting a build.

## Quality gates

- [ ] `pnpm test` passes (Vitest).
- [ ] `pnpm -r typecheck` passes (all packages, strict TypeScript).
- [ ] No new lint errors in changed files.

## Secrets and environment

- [ ] No `.env` files are tracked: `git ls-files | grep -E '\.env$'` returns
      nothing (only `*.env.example` should be tracked).
- [ ] API env set where it runs: `OPENAI_API_KEY`, `OPENAI_MODEL`, and the AI
      timeout / rate-limit vars (see `apps/api/.env.example`).
- [ ] Mobile `EXPO_PUBLIC_API_URL` points at the right API for the target
      (simulator localhost / LAN IP / deployed HTTPS via `eas.json`).
- [ ] No server-side secrets in any `EXPO_PUBLIC_*` value or the app bundle.

## iOS build config

- [ ] `apps/mobile/app.json`: name is **Graceward**, bundle id
      `com.graceward.app`, microphone permission string present and accurate.
- [ ] `apps/mobile/eas.json` present with development / preview / production
      profiles and the correct per-profile API URL.
- [ ] Final icon, splash, and adaptive icon assets added and referenced in
      `app.json` (still a TODO — placeholders/Expo defaults today).
- [ ] App Store screenshots prepared (see `docs/17_APP_STORE_CHECKLIST.md`).

## Functional smoke tests (on simulator and a physical iPhone)

- [ ] Microphone flow: record a voice reflection, confirm permission prompt and
      local playback.
- [ ] Export: produces a JSON file via the share sheet; confirm it excludes raw
      audio bytes.
- [ ] Delete: clears local content, audio, and preferences; app still works with
      empty states.
- [ ] AI reflection consent: AI runs only after explicit consent; consent notice
      reappears after a delete.
- [ ] AI error states: with no/invalid `OPENAI_API_KEY` the app shows the calm
      "not configured" message; rapid requests surface the rate-limited message.

## Privacy and store copy

- [ ] Privacy readiness note reviewed (see `docs/11_SECURITY_AND_PRIVACY.md`)
      and matches actual app behavior.
- [ ] App Store privacy labels drafted conservatively; no privacy overclaiming.

## App asset readiness (TODO — no final assets wired)

There are currently **no asset files** in `apps/mobile/` and `app.json` does not
reference any `icon`/`splash`/`adaptiveIcon` (Expo falls back to its built-in
defaults). Do not add `app.json` references until the real files exist at the
expected paths, or builds will fail. Recommended Expo/iOS sizes when producing
the final artwork:

- [ ] **App icon** — `apps/mobile/assets/icon.png`, **1024×1024 px**, PNG,
      square, no transparency/alpha, no rounded corners (iOS masks it).
- [ ] **iOS app icon (App Store)** — same 1024×1024 source is reused by Expo for
      the store listing; ensure it has no alpha channel.
- [ ] **Splash image** — `apps/mobile/assets/splash.png`. Use a centered logo
      around **1284×2778 px** (full-screen) or a smaller centered mark
      (~**1024×1024 px**) with `resizeMode: "contain"` and a matching
      `backgroundColor` via the `expo-splash-screen` plugin.
- [ ] **Adaptive icon (Android only)** — `apps/mobile/assets/adaptive-icon.png`,
      **1024×1024 px** foreground with safe padding. Optional for an iOS-only
      release; add only if/when Android ships.
- [ ] **Web favicon (optional)** — `apps/mobile/assets/favicon.png`, **48×48 px**.
- [ ] **App Store screenshots (prepared later, not in the build)**:
  - 6.7" iPhone (required): **1290×2796 px** (portrait).
  - 6.5" iPhone: **1242×2688 px**.
  - 12.9" iPad (required because `supportsTablet: true`): **2048×2732 px**.

After the files exist, wire them in `app.json` under `expo.icon`,
`expo.ios.icon`, and the splash plugin config, then re-run typecheck and a build.

## Build smoke commands

Run from the repo root. These do not require EAS login or credentials.

```bash
# Quality gates
pnpm test            # Vitest (unit)
pnpm -r typecheck    # strict TypeScript across all packages

# Local API (needs apps/api/.env with OPENAI_API_KEY for live AI)
pnpm dev:api
curl http://localhost:3000/health   # -> { "status": "ok", "service": "api" }

# Local mobile (Expo dev server; press i for iOS simulator)
pnpm dev:mobile
```

EAS build commands (review only — do **not** run as part of this pass; they
require an Expo account/login and provisioning):

```bash
# One-time: install the CLI if needed
npm install -g eas-cli

# From apps/mobile/. Development client (simulator-friendly):
eas build --profile development --platform ios

# Internal preview (TestFlight-style distribution):
eas build --profile preview --platform ios
```

## Known blockers before public launch

- [ ] AI endpoint still has in-memory rate limiting only and no auth/user
      identity — add a real abuse-control plan (see `docs/14_DEPLOYMENT.md`)
      before opening the API publicly. Keep production builds private (closed
      beta / TestFlight) until then.
- [ ] Final artwork (icon/splash/screenshots) produced.
