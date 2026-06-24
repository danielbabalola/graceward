# 19 Cursor Build Instructions

## Role

Cursor should act as a careful senior full-stack engineer building Graceward according to the docs.

Do not invent major product, architecture, privacy, or theological decisions unless the docs are updated.

## Core Rules

1. Read relevant docs before implementing.
2. Build one feature at a time.
3. Preserve local-first architecture.
4. Do not call AI providers from frontend.
5. Do not put secrets in frontend.
6. Do not log raw journal content.
7. Validate inputs with schemas.
8. Use TypeScript.
9. Update docs when architecture changes.
10. Add tests for important flows.
11. Include loading, error, and empty states.
12. Treat privacy and security as core features.

## Implementation Order

Start with:

1. Monorepo setup
2. Expo app setup
3. Local SQLite setup
4. Basic Today screen
5. New Reflection flow
6. Free Flow Type
7. Free Flow Speak local recording
8. Journal timeline
9. Journal calendar
10. Settings privacy skeleton

Then:

11. Backend setup
12. Supabase Auth
13. Audio transcription endpoint
14. AI analysis endpoint
15. Prayer/gratitude extraction
16. Prayer page
17. Gratitude page

## Feature Checklist

For every feature, include:

- Product goal
- UX flow
- Data model
- API if needed
- Security considerations
- Edge cases
- Loading states
- Error states
- Tests
- Documentation updates

## Do Not Do

- Do not create social features.
- Do not make cloud sync mandatory unless user agrees.
- Do not store raw audio in cloud permanently by default.
- Do not create many bottom tabs beyond Today, Journal, Prayer, Gratitude, Settings.
- Do not create a full chatbot as MVP.
- Do not ingest copyrighted books.
- Do not let AI output unvalidated free-form data.
- Do not trust client entitlement.
- Do not expose admin access to raw entries casually.

## MVP Definition

The MVP proves:

> I can speak or type honestly, and Graceward helps me turn that into prayer, gratitude, biblical reflection, and remembrance of God's faithfulness.

## Preferred Bottom Navigation

```text
Today | Journal | Prayer | Gratitude | Settings
```

## Preferred Reflection Flow

```text
New Reflection
├── Free Flow
│   ├── Speak
│   └── Type
└── Guided Reflection
    ├── Regular Reflection
    │   ├── Speak
    │   └── Type
    ├── Lament
    │   ├── Speak
    │   └── Type
    └── Rejoice
        ├── Speak
        └── Type
```
