# 07 API Spec

## API Principles

- Backend validates auth.
- Backend enforces rate limits.
- Backend enforces entitlements.
- Backend validates all input with schemas.
- Backend never trusts the mobile client for Pro status.
- Backend returns consistent error shapes.
- Backend avoids logging raw journal content.

## Standard Error Shape

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "requestId": "req_123"
  }
}
```

## Endpoints

### POST /api/reflections/analyze

Analyze a text entry or transcript.

Request:

```json
{
  "entryLocalId": "local_123",
  "mode": "free_flow",
  "reflectionPath": "free_flow",
  "inputText": "Today was...",
  "memoryMode": "no_memory"
}
```

Response:

```json
{
  "summary": "...",
  "emotionalTone": "...",
  "spiritualTone": "...",
  "keyThemes": ["work", "gratitude"],
  "prayerPoints": [],
  "gratitudes": [],
  "wins": [],
  "biblicalReflection": "...",
  "gentleCorrection": null,
  "nextStep": "...",
  "followUpQuestion": "..."
}
```

### POST /api/audio/transcribe

Upload or process audio for transcription.

Request:

- Multipart audio upload
- entryLocalId
- durationSeconds
- retentionPolicy

Response:

```json
{
  "transcript": "...",
  "provider": "openai",
  "durationSeconds": 600,
  "cloudAudioDeleted": true
}
```

### POST /api/sync/push

Push local encrypted records if cloud sync is enabled.

### GET /api/sync/pull

Pull remote encrypted records if cloud sync is enabled.

### GET /api/me

Return profile and entitlement status.

### PATCH /api/me/settings

Update cloud-visible settings.

### POST /api/account/export

Request user data export.

### DELETE /api/account

Delete account and associated cloud data.

### POST /api/feedback

Submit feedback.

### GET /api/admin/users/:id

Admin only. Requires audit log.

### GET /api/admin/jobs

Admin only. View job status.

## Rate Limits

Rate limit:

- Audio transcription
- AI analysis
- Export
- Delete account
- Login attempts
- Sync
- Admin endpoints

## Entitlement Checks

Server checks:

- Pro status
- Voice duration limits
- AI analysis limits
- Weekly review limits
- Monthly review limits
- Storage limits

## Logging

Allowed:

- request ID
- user ID
- endpoint
- latency
- status code
- job ID
- provider name
- token estimate
- error category

Not allowed in normal logs:

- raw journal entry
- raw transcript
- raw prayer request
- raw audio
- sensitive theological/personal content
