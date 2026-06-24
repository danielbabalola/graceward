# 14 Deployment

## MVP AI Reflection Deployment (Current State)

These notes reflect what is actually built today (text-only AI reflection v1).
They take precedence over the aspirational sections below where they differ.

- **The API must be deployed before production AI reflection can work.** The
  mobile app calls `POST /ai/analyze-reflection` on the Graceward API. With no
  reachable API, the app degrades to a calm "AI service isn't set up yet" error
  and all other features keep working locally.
- **The AI provider key stays server-side only.** `OPENAI_API_KEY` lives in the
  API environment (Railway/host env vars), never in the mobile bundle. If it is
  missing the endpoint returns `AI_NOT_CONFIGURED` instead of calling any
  provider.
- **Mobile selects the API via `EXPO_PUBLIC_API_URL`.** Set it per environment:
  localhost for the simulator, the Mac's LAN IP for a physical iPhone, and the
  deployed HTTPS URL for preview/production (configured per profile in
  `apps/mobile/eas.json`). `EXPO_PUBLIC_` values ship inside the app bundle, so
  only the public base URL belongs there.
- **The endpoint currently has in-memory rate limiting only and no auth.**
  Limits (`AI_RATE_LIMIT_MAX` / `AI_RATE_LIMIT_WINDOW_SECONDS`) are per-IP and
  per-instance; they reset on restart and do not coordinate across instances.
  There is no user identity, API key, or per-user quota yet.
- **Add a real abuse-control plan before public launch.** Before opening the API
  to the public, add at least: auth / user identity, shared (e.g. Redis-backed)
  rate limiting or an API gateway, per-user quotas, and provider cost alerts.
  Until then, keep production deployments private (TestFlight / closed beta).

### TestFlight vs public exposure (read before deploying the API)

- **TestFlight with a small, trusted group may be acceptable** with the current
  in-memory / per-IP rate limiting, because the audience is known and bounded.
  Still keep the deployed API URL out of public places and watch provider usage.
- **Public release must NOT expose the AI endpoint without stronger abuse
  control.** With no auth and per-instance limits, a public URL is open to abuse
  and runaway provider cost. Treat this as a hard launch blocker.
- **Future options to add before public launch (pick a combination):**
  - Auth / user identity (e.g. Apple Sign In) so requests are attributable.
  - Per-user quotas (daily/monthly AI reflection limits).
  - Server-side subscription / entitlement checks (never trust the client).
  - Cost alerts and budget caps on the AI provider account.
  - A persistent, shared rate limiter (e.g. Redis) or an API gateway so limits
    survive restarts and coordinate across instances.

### Deploying the API for a preview / TestFlight build

Platform-neutral steps. Examples below mention Railway / Render / Fly.io only as
options — any Node host works. No secrets or deployed URLs are committed.

1. **Deploy the API first.** The mobile preview build points at a deployed HTTPS
   URL, so the API must be live before the build is useful.
2. **Set server-side env vars** on the host (never in the mobile app):
   - `OPENAI_API_KEY` (required; without it the endpoint returns
     `AI_NOT_CONFIGURED`).
   - `OPENAI_MODEL` (optional; defaults to `gpt-5.4-mini`).
   - `AI_PROVIDER_TIMEOUT_MS`, `AI_RATE_LIMIT_MAX`,
     `AI_RATE_LIMIT_WINDOW_SECONDS` (optional; sensible defaults).
   - `HOST` and `PORT`: the server binds to `process.env.HOST ?? "0.0.0.0"` and
     `process.env.PORT ?? 3000`. Most hosts inject `PORT` automatically — do not
     hardcode it. `NODE_ENV=production` enables a startup safety warning.
3. **Run command.** Install deps and start:
   ```bash
   pnpm install --frozen-lockfile
   pnpm --filter @graceward/api start   # runs: tsx src/index.ts
   ```
   The API starts via `tsx` (a runtime dependency), not `node dist`, because the
   shared workspace packages (`@graceward/shared`, `@graceward/ai-schemas`)
   export TypeScript source. Running plain `node dist/index.js` only works on
   Node versions with type-stripping and is not relied on for deploys.
4. **Verify `/health`:**
   ```bash
   curl -s https://YOUR-API-HOST/health
   # -> {"status":"ok","service":"api"}
   ```
5. **Verify `/ai/analyze-reflection`** with safe dummy text (this makes a real,
   billable provider call when a key is set):
   ```bash
   curl -s -X POST https://YOUR-API-HOST/ai/analyze-reflection \
     -H 'Content-Type: application/json' \
     -d '{"journalEntryId":"smoke-1","entryDate":"2026-01-01","mode":"free_flow","inputType":"text","rawText":"Thank you for today. Please help me rest well tonight."}'
   ```
   A `200` with structured JSON means the full path works. `AI_NOT_CONFIGURED`
   means the key is missing; `RATE_LIMITED` means the limiter tripped.
6. **Point the mobile preview build at the deployed URL.** Set
   `EXPO_PUBLIC_API_URL` in the `preview` profile of `apps/mobile/eas.json` to
   the HTTPS API URL. `EXPO_PUBLIC_*` values are bundled into the app, so only
   the public API base URL belongs there — never the OpenAI key.
7. **Run the preview build** (requires Expo login; not run as part of this repo
   work):
   ```bash
   cd apps/mobile && eas build --platform ios --profile preview
   ```

**Deployment caveat — rate limiting behind a proxy:** the in-memory limiter keys
on `request.ip`. Behind a load balancer/proxy (typical on PaaS) Fastify reports
the proxy's address unless `trustProxy` is configured, so per-client limiting
degrades. This reinforces that the current limiter is for MVP/closed testing
only; see the abuse-control plan above before public launch.

## Environments

Use:

- Local
- Staging
- Production

## Mobile

Use Expo/EAS.

Required:

- Expo project
- EAS build config
- iOS simulator support
- TestFlight support
- environment-specific config

## Backend

Use Railway.

Required:

- API service
- Worker service
- Environment variables
- Health check
- Logs
- Staging and production projects/environments

## Supabase

Use separate projects for:

- Staging
- Production

Required:

- Auth config
- Database migrations
- Storage buckets
- RLS policies
- Backups
- API keys managed securely

## Deployment Checklist

Before deploying:

- Tests pass.
- Migrations tested locally.
- Migrations tested in staging.
- Environment variables set.
- Sentry configured.
- No secrets committed.
- No frontend AI keys.
- Rate limits configured.
- Storage policies verified.
- RLS verified.

## Rollback Plan

Have rollback for:

- Backend deploy
- Mobile release
- Database migration
- AI prompt version
- Feature flags

## Release Channels

Recommended:

- dev
- preview
- production

## App Store

Before App Store submission:

- Privacy Policy URL
- Terms URL
- Support URL
- Account deletion
- App privacy labels
- Subscription metadata if paid
- Test account if needed
- Screenshots
- Review notes
