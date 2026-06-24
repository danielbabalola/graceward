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
