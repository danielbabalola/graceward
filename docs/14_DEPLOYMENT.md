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
- **Closed-beta access control is in place, but it is NOT real auth.** All three
  paid AI endpoints (`/ai/analyze-reflection`, `/ai/transcribe-reflection`,
  `/ai/structure-voice-entry`) are protected by three layers:
  1. **Per-IP rate limiting** for burst abuse (`AI_RATE_LIMIT_MAX` /
     `AI_RATE_LIMIT_WINDOW_SECONDS`) — in-memory, per-instance, resets on
     restart.
  2. **Anonymous per-install ID.** The mobile app generates a random UUID on
     first AI use, stores it locally, and sends it as the
     `X-Graceward-Install-Id` header. It is **not an account**, not a login, and
     not derived from any device/advertising identifier. Requests without a
     valid install ID get `401 INSTALL_ID_REQUIRED`. The server logs only a
     short fingerprint of the ID, never the full value, and never request
     content.
  3. **Per-install daily quotas** (`AI_DAILY_*_QUOTA_PER_INSTALL`), backed by a
     small JSON file (`AI_QUOTA_STORE_PATH`, default `./.data/ai-quota.json`).
     Exceeding a cap returns `429 AI_QUOTA_EXCEEDED` with a `Retry-After`
     header. Quotas reset per UTC day and only increment on a successful paid
     call.
  - **Emergency kill switch:** set `AI_ENDPOINTS_ENABLED=false` to make all
    three AI endpoints return `503 AI_DISABLED` before any paid call.
  - There is still **no user identity, account, subscription, or entitlement**.
    This is closed-beta cost/abuse protection only.
- **Add a real abuse-control plan before public launch.** Before opening the API
  to the public, add at least: auth / user identity, shared (e.g. Redis/Postgres)
  rate limiting + quotas or an API gateway, per-user entitlements, and provider
  cost alerts. The quota store interface (`QuotaStore` in
  `apps/api/src/ai/quota-store.ts`) is deliberately tiny so the file-backed beta
  store can be swapped for Redis/Postgres without touching the routes. Until
  then, keep production deployments private (TestFlight / closed beta).

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
   - `OPENAI_API_KEY` (required; without it the endpoints return
     `AI_NOT_CONFIGURED`).
   - `OPENAI_MODEL` (optional; defaults to `gpt-5.4-mini`).
   - `AI_PROVIDER_TIMEOUT_MS`, `AI_RATE_LIMIT_MAX`,
     `AI_RATE_LIMIT_WINDOW_SECONDS` (optional; sensible defaults).
   - **Access control (closed beta):** `AI_ENDPOINTS_ENABLED` (kill switch,
     default `true`), `AI_DAILY_TOTAL_QUOTA_PER_INSTALL`,
     `AI_DAILY_ANALYZE_QUOTA_PER_INSTALL`,
     `AI_DAILY_TRANSCRIBE_QUOTA_PER_INSTALL`,
     `AI_DAILY_STRUCTURE_QUOTA_PER_INSTALL` (optional; conservative defaults),
     and `AI_QUOTA_STORE_PATH` (optional; defaults to `./.data/ai-quota.json`).
     **Give the quota file a persistent, writable path** (a mounted volume on
     PaaS) so per-install quotas survive restarts — otherwise they reset on each
     deploy. The store is single-instance; for multiple instances, move it to a
     shared backend before relying on the caps.
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
   billable provider call when a key is set). A valid install-ID header is now
   required:
   ```bash
   curl -s -X POST https://YOUR-API-HOST/ai/analyze-reflection \
     -H 'Content-Type: application/json' \
     -H 'X-Graceward-Install-Id: 11111111-1111-4111-8111-111111111111' \
     -d '{"journalEntryId":"smoke-1","entryDate":"2026-01-01","mode":"free_flow","inputType":"text","rawText":"Thank you for today. Please help me rest well tonight."}'
   ```
   A `200` with structured JSON means the full path works. `AI_NOT_CONFIGURED`
   means the key is missing; `RATE_LIMITED` means the IP limiter tripped;
   `INSTALL_ID_REQUIRED` means the install-ID header was missing/invalid;
   `AI_QUOTA_EXCEEDED` means the per-install daily cap was hit; `AI_DISABLED`
   means `AI_ENDPOINTS_ENABLED=false`.
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
