# 04 Architecture

## Architecture Summary

Graceward is an iOS-first, local-first, hybrid-cloud app.

Recommended stack:

- Mobile: Expo, React Native, TypeScript
- Local database: SQLite
- Backend: Node.js with Fastify
- Cloud database/auth/storage: Supabase
- Hosting: Railway
- Queue: BullMQ + Redis or hosted queue alternative
- AI: Server-mediated provider calls
- Monitoring: Sentry
- Payments: RevenueCat or StoreKit later

## Backend Framework

**Fastify** (`apps/api`).

Chosen for MVP because it is lighter and faster to scaffold than NestJS, with less boilerplate. It fits API routes, AI orchestration, webhooks, and queue workers without enterprise-style structure we do not need yet. Revisit only if backend complexity outgrows this model.

## Architecture Principle

> Local by default. Cloud when useful. AI only with purpose and permission.

## Mobile App Responsibilities

The mobile app handles:

- Local journal storage
- Local drafts
- Voice recording
- Offline queue
- Displaying journal timeline/calendar
- Displaying prayer/gratitude data
- User preferences
- Privacy controls
- Calling backend for AI/transcription/sync
- Never calling AI providers directly

## Backend Responsibilities

The backend handles:

- Authentication validation
- Rate limits
- Subscription entitlements
- Audio upload orchestration
- Transcription jobs
- AI analysis jobs
- RAG retrieval
- Prompt versioning
- Structured response validation
- Usage tracking
- Export/delete workflows
- Admin support metadata

## Supabase Responsibilities

Supabase handles:

- Auth
- User profiles
- Optional synced data
- Storage
- Postgres database
- pgvector for curated wisdom/RAG
- Row Level Security
- Backups

## Railway Responsibilities

Railway hosts:

- Backend API
- Background workers
- Queue workers
- Cron/scheduled jobs
- Admin dashboard later

## Local Database

SQLite stores:

- Journal entries
- Audio metadata
- Transcripts
- AI outputs
- Prayer requests
- Prayer points
- Gratitudes
- Wins
- Lessons
- Follow-ups
- Settings
- Sync queue

## Cloud Data

Cloud should store only what is necessary:

- Auth profile
- Optional encrypted sync data
- AI job metadata
- Subscription state
- Usage events
- Curated wisdom sources
- Audit logs
- Admin support metadata

## AI Provider Boundary

Frontend must never call OpenAI or any AI provider directly.

All AI calls go through backend so the server can enforce:

- Auth
- Rate limits
- Entitlements
- Prompt versions
- Safety policy
- Logging
- Structured output validation
- Cost control

## Environment Strategy

Use:

- Local
- Staging
- Production

Rules:

- Separate Supabase projects for staging and production.
- Separate Railway environments.
- Separate AI keys.
- Separate storage buckets.
- Never test destructive migrations first in production.

## Monorepo Recommendation

Suggested structure:

```text
graceward/
├── apps/
│   ├── mobile/
│   └── api/
├── packages/
│   ├── shared/
│   ├── db/
│   ├── config/
│   └── ai-schemas/
├── docs/
└── .cursor/
```

## Shared Package

Shared package should contain:

- Zod schemas
- API types
- Enums
- Constants
- Shared utility types

## High-Level Data Flow

### Voice Reflection

1. User records locally.
2. Audio metadata saved locally.
3. User submits for AI processing.
4. Backend receives upload.
5. Backend sends to transcription provider.
6. Transcript returned.
7. Cloud audio deleted by default.
8. Transcript returned to app.
9. AI analysis job runs.
10. Structured output returned.
11. App stores outputs locally.
12. Optional sync happens if enabled.

### Text Reflection

1. User writes locally.
2. Entry saved locally.
3. User submits for AI processing.
4. Backend analyzes text.
5. Structured output returned.
6. App stores outputs locally.
7. Optional sync happens if enabled.
