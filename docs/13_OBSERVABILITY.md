# 13 Observability

## Goal

Graceward should be observable from day one without exposing sensitive user content.

## Tools

Recommended:

- Sentry for mobile and backend errors
- Structured backend logs
- Job queue dashboard
- Uptime monitoring
- Metrics dashboard
- Audit log viewer
- Admin dashboard later

## Events to Track

Track technical/product events without raw content:

- app_opened
- reflection_started
- reflection_saved
- voice_recording_started
- voice_recording_completed
- transcription_started
- transcription_failed
- ai_analysis_started
- ai_analysis_failed
- prayer_request_created
- prayer_marked_answered
- gratitude_created
- export_requested
- account_delete_requested
- subscription_activated later

## Do Not Track

Do not send to analytics:

- raw journal content
- raw transcript
- raw prayer request
- raw gratitude
- raw audio
- sensitive reflection text

## Logs

Include:

- requestId
- userId
- endpoint
- statusCode
- latency
- jobId
- provider
- error category

Exclude:

- private content
- tokens/secrets
- raw prompts with user content
- raw AI input/output unless in protected debug mode

## Alerts

Alert on:

- backend down
- database down
- transcription failure spike
- AI failure spike
- payment webhook failure later
- account deletion failure
- export failure
- high error rate
- high latency

## AI Metrics

Track:

- job count
- success/failure
- provider latency
- retry count
- approximate token usage
- prompt version
- safety flag category

Do not track raw content.
