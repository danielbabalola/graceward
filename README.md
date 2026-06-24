# Graceward: Daily Reflection

Graceward is a private Christian reflection app that helps users process their day through voice or text, turning daily thoughts into prayer points, gratitude, biblical reflection, spiritual insights, and reminders of God's faithfulness over time.

The app is iOS-first, local-first, privacy-conscious, Scripture-rooted, and pastorally wise.

## Working App Store Name

**Graceward: Daily Reflection**

## Tagline

**Pause. Reflect. Remember God's faithfulness.**

## Monorepo Structure

```text
graceward/
├── apps/
│   ├── mobile/          # Expo + React Native + TypeScript + Expo Router
│   └── api/             # Fastify API
├── packages/
│   ├── shared/          # Shared types, enums, constants
│   ├── db/              # Local SQLite (future)
│   ├── config/          # Shared TypeScript config
│   └── ai-schemas/      # Structured AI output schemas (future)
├── docs/
└── .cursor/rules/
```

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+
- For iOS development: Xcode and iOS Simulator (macOS)

## Install

From the repository root:

```bash
pnpm install
```

Copy environment examples when needed:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

## Run the API

Development (with hot reload):

```bash
pnpm dev:api
```

Health check:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "status": "ok", "service": "api" }
```

## Run the Mobile App

Start the Expo dev server:

```bash
pnpm dev:mobile
```

Then:

- Press `i` to open the iOS Simulator (requires Xcode)
- Scan the QR code with Expo Go on a physical device

Open iOS Simulator directly:

```bash
pnpm --filter @graceward/mobile ios
```

## Other Scripts

```bash
pnpm typecheck   # Type-check all packages
pnpm build       # Build packages that define a build script
```

## MVP Stack

- Mobile: Expo, React Native, TypeScript
- Navigation: Expo Router
- Local database: SQLite
- Backend: Node.js with Fastify
- Cloud database/auth/storage: Supabase
- Hosting: Railway
- AI: Server-mediated provider calls only
- Error monitoring: Sentry
- Subscriptions: RevenueCat or StoreKit later

## Project Principles

1. Local-first by default.
2. Cloud only when useful.
3. AI only with purpose and permission.
4. No AI provider keys in the frontend.
5. Raw audio should be temporary by default.
6. Scripture is the highest theological authority.
7. JTTE and curated book-inspired wisdom power the app behind the scenes.
8. The app should be pastoral, not pandering.
9. Security is a product feature.
10. Cursor should not invent major architecture choices without updating docs.

## Documentation Map

See the `docs/` folder:

- `00_PROJECT_OVERVIEW.md`
- `01_PRODUCT_REQUIREMENTS.md`
- `02_USER_FLOWS.md`
- `03_DESIGN_SYSTEM.md`
- `04_ARCHITECTURE.md`
- `05_LOCAL_FIRST_STRATEGY.md`
- `06_DATABASE_SCHEMA.md`
- `07_API_SPEC.md`
- `08_AI_SYSTEM.md`
- `09_RAG_AND_WISDOM_LAYER.md`
- `10_THEOLOGICAL_TONE_GUIDE.md`
- `11_SECURITY_AND_PRIVACY.md`
- `12_TESTING_STRATEGY.md`
- `13_OBSERVABILITY.md`
- `14_DEPLOYMENT.md`
- `15_ADMIN_AND_SUPPORT.md`
- `16_MONETIZATION.md`
- `17_APP_STORE_CHECKLIST.md`
- `18_ROADMAP.md`
- `19_CURSOR_BUILD_INSTRUCTIONS.md`

## Initial Build Order

1. Set up monorepo.
2. Set up Expo app.
3. Add local SQLite foundation.
4. Build local text reflection.
5. Build local voice recording.
6. Add local journal timeline and calendar view.
7. Add auth.
8. Add backend.
9. Add transcription pipeline.
10. Add AI reflection pipeline.
