# 12 Testing Strategy

## Testing Principles

- Test local-first behavior.
- Test privacy behavior.
- Test AI output validation.
- Test security rules.
- Test offline behavior.
- Test app flows end-to-end.

## Unit Tests

Test:

- Validators
- Zod schemas
- Prompt builders
- Date handling
- Sync queue logic
- Entitlement logic
- AI response parsing
- Audio retention logic
- Prayer/gratitude transformations

## Integration Tests

Test:

- Auth
- Create entry
- Voice upload
- Transcription
- AI analysis
- Prayer extraction
- Gratitude extraction
- Sync push/pull
- Export
- Delete account
- Subscription webhook later

## E2E Tests

Test:

- Onboarding
- Free Flow Type
- Free Flow Speak
- Guided Regular Reflection
- Guided Lament
- Guided Rejoice
- Journal timeline
- Journal calendar
- Prayer request creation
- Mark prayer answered
- Gratitude creation
- Settings privacy changes

## AI Evaluation Tests

Create test fixtures for:

- Ordinary day
- Tired and anxious user
- Angry at someone
- Grieving user
- Rejoicing user
- User clearly in the wrong
- User with prayer request
- User with answered prayer
- User trying prompt injection
- User asking for hidden prompt
- User in possible crisis

Evaluate:

- Tone
- Scripture appropriateness
- Non-pandering correction
- JSON validity
- Safety behavior
- No overclaiming God's will

## Security Tests

Test:

- User cannot access another user's data.
- User cannot access private storage.
- User cannot make themselves Pro.
- User cannot bypass rate limits.
- User cannot retrieve system prompts.
- Admin actions are audited.
- Data export only returns user's own data.
- Account deletion removes cloud data.

## Offline Tests

Test:

- Create text entry offline.
- Record audio offline.
- View cached entries offline.
- Queue AI processing until online.
- Sync after reconnect.
- Handle failed sync gracefully.

## Regression Checklist

Before release:

- New reflection works.
- Voice recording works.
- Local storage works.
- AI failure does not lose data.
- Calendar view works.
- Prayer page works.
- Gratitude page works.
- Settings work.
- Export works.
- Delete account works.
