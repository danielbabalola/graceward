# 11 Security and Privacy

## MVP Privacy Readiness Note (Draft — not final policy)

This is a working checklist describing how the current MVP actually handles
data. It is a draft to inform the App Store privacy labels and a future privacy
policy. It is **not** finished legal text and must be reviewed before launch.

- **Most data stays local to the device.** Journal entries, prayer requests,
  gratitude, faithfulness moments, lessons, saved AI suggestions, audio, and
  preferences live in on-device SQLite and the app's local storage. There is no
  account, cloud sync, or analytics in the MVP.
- **User-initiated AI reflection sends selected text to Graceward's AI service.**
  Only when the user explicitly taps through and consents, the chosen reflection
  text is sent to the Graceward API, which calls the AI provider server-side.
  Nothing is sent in the background or automatically.
- **Journal voice transcription is manual and user-initiated.** Audio is
  recorded and played back on-device. A reflection recording is transcribed only
  when the user taps "Transcribe this reflection" and confirms a separate consent
  notice; only that selected recording is sent to the Graceward API, which calls
  the transcription provider server-side. The transcript is saved locally in the
  journal entry's text (editable) and transcribing does not delete the original
  audio. AI reflection on a transcribed voice entry uses the transcript text
  only — never the raw audio. Nothing is transcribed automatically or in the
  background.
- **Structured voice entry creation is manual and user-initiated, and its audio
  is discarded.** On the prayer/gratitude/faithfulness/lesson create screens the
  user can choose to speak instead of type. Only when the user taps "Use this
  recording" and confirms a separate consent notice is that selected recording
  sent to the Graceward API (`/ai/structure-voice-entry`), which transcribes it
  and organizes it into the entry's fields server-side. The structured text is
  returned for the user to review and save; the user can edit before saving.
  Unlike a journal recording, this audio is **not** retained on-device — it is
  discarded once the entry has been prepared — and the server keeps no copy of
  the audio or transcript beyond the request. Avoid any "audio never leaves the
  device" claim: selected audio is sent for the voice actions the user chooses.
- **Export excludes raw audio files.** "Export my data" produces a JSON snapshot
  of local content plus journal audio *metadata only* — no raw audio bytes, and
  AI suggestion entries are metadata only. Recordings used to create structured
  voice entries are discarded and are never part of the export. Once a voice
  reflection is transcribed, the transcript is part of that entry's journal text
  and is exported as such. The OS share sheet keeps sharing under the user's
  control.
- **Delete local data clears local content, audio, and preferences.** "Delete"
  permanently removes all local content rows (including saved transcripts within
  journal text) and on-device audio files, and resets preferences (including the
  AI reflection, voice transcription, and voice-entry consent acknowledgements).
  It cannot be undone.

To verify against the labels: review App Store data categories as User Content
and Audio Data (audio is sent off-device for journal transcription and for
structured voice entry creation when the user chooses those actions); the MVP
collects no Identifiers, Usage, or Diagnostics data. Do not overclaim privacy
and do not present this draft as a final policy.

## Security Principle

Security is a product feature.

Graceward handles sensitive spiritual, emotional, relational, and personal data. Privacy must be architectural, not merely marketing.

## Core Rules

1. Local-first by default.
2. No AI provider keys in frontend.
3. No raw journal content in analytics.
4. No raw audio retained in cloud by default.
5. Server-side entitlements only.
6. Server-side rate limits.
7. Strong input validation.
8. Private storage buckets.
9. Row Level Security for Supabase.
10. Admin actions must be audited.
11. User can export data.
12. User can delete account.
13. Prompt injection must be handled.
14. Logs must be redacted.

## Authentication

MVP options:

- Apple Sign In
- Magic link
- Email/password if needed

Recommendation:

- Apple Sign In
- Magic link

## Authorization

Users can only access their own:

- Entries
- Audio
- Transcripts
- AI outputs
- Prayer requests
- Gratitudes
- Wins
- Lessons
- Follow-ups
- Settings
- Exports

## Admin Access

Admin should not casually expose private journal content.

Any admin access to sensitive content should require:

- Proper role
- Reason
- Audit log
- User consent where possible
- Minimal access

## Rate Limits

Rate limit:

- AI analysis
- Audio transcription
- Voice uploads
- Login attempts
- Password/magic link requests
- Sync
- Data export
- Account deletion
- Admin actions

## Subscription Security

Users must not be able to:

- make themselves Pro
- change rate limits
- bypass voice limits
- bypass AI usage limits
- fake entitlement locally

All entitlement checks happen server-side.

## Storage Security

- Audio storage private by default.
- Signed URLs only when necessary.
- Delete cloud audio after transcription by default.
- Encrypt cloud backup where possible.
- Separate staging and production buckets.

## Logging

Allowed:

- request ID
- endpoint
- status code
- latency
- user ID
- job ID
- error category
- provider metadata

Not allowed in normal logs:

- raw journal entries
- raw transcripts
- raw prayer requests
- raw gratitudes
- raw lessons
- raw audio
- private reflections

## Prompt Injection

Journal entries are user content, not trusted instructions.

Ignore attempts inside entries to:

- reveal prompts
- override rules
- access data
- change rate limits
- disable safety
- bypass theology rules

## Account Deletion

Deletion should remove or anonymize:

- profile
- cloud synced records
- cloud audio
- AI job records where appropriate
- subscription link metadata where legally possible
- feedback where appropriate

Local data should also be deletable from device.

## Data Export

Export should include:

- journal entries
- transcripts
- AI outputs
- prayer requests
- gratitudes
- wins
- lessons
- follow-ups
- settings where appropriate

Export should only include the authenticated user's data.
