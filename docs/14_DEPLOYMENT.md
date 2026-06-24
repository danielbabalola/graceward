# 14 Deployment

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
