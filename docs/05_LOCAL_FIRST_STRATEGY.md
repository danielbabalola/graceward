# 05 Local-First Strategy

## Core Principle

Graceward should be local-first and hybrid-cloud.

> Local by default. Cloud when useful. AI only with purpose and permission.

## Why Local-First Matters

The app handles deeply sensitive information:

- Prayers
- Private thoughts
- Confession
- Relationship struggles
- Anxiety
- Spiritual doubts
- Voice notes
- Prayer requests
- Gratitude
- Personal history

Privacy is not only a setting. It is part of the product promise.

## What Lives Locally First

Store on-device first:

- Journal drafts
- Text entries
- Voice recordings
- Transcripts
- AI outputs
- Prayer requests
- Prayer points
- Gratitudes
- Wins
- Lessons
- Follow-ups
- Weekly review summaries
- User preferences
- Offline queue

## What May Go to Cloud

Cloud is used for:

- Account auth
- Optional encrypted backup/sync
- Transcription
- AI processing
- Subscription entitlements
- Rate limiting
- Push notifications
- Aggregated non-sensitive metrics
- Admin support metadata

## Audio Policy

Default:

- Record audio locally.
- Upload only when transcription is requested.
- Delete cloud audio after transcription.
- Let user choose whether to retain local audio.

User options:

1. Delete audio after transcription
2. Keep audio on device only
3. Back up encrypted audio to cloud
4. Manually delete audio anytime

## AI Memory Modes

### No Memory

AI only sees the current entry.

### Local Memory Only

App retrieves relevant local snippets and sends only selected snippets.

### Cloud Memory

User allows encrypted sync and cloud-assisted retrieval.

### Full Spiritual Review Mode

User allows broader summaries, prayer history, gratitude history, answered prayers, and recurring lessons to be used in reviews.

## Recommended MVP Default

- Current entry can be processed by AI when user requests it.
- Long-term AI memory is opt-in or clearly explained.
- Cloud sync is opt-in or clearly explained.
- Raw cloud audio is deleted after transcription.

## Sync Statuses

Every local record should support:

- local_only
- pending_upload
- syncing
- synced
- failed
- conflict
- deleted_pending_sync

## Sensitive Storage Preference

Every sensitive record may have:

- device_only
- encrypted_cloud_backup
- cloud_processing_allowed
- delete_after_processing

## Offline Behavior

If offline:

- User can create text entries.
- User can record voice entries locally.
- User can view cached entries.
- User can create prayer requests.
- User can add gratitude.
- AI processing is queued or disabled with clear messaging.
- Sync retries later.

## Conflict Handling

MVP can use simple rules:

1. Local edits are source of truth before first sync.
2. If same record changes locally and remotely, mark conflict.
3. Show user the latest local version and remote version later.
4. Avoid complex conflict UI in MVP unless needed.

## Logging Rule

Never log raw journal content, raw transcript content, or raw prayer content in ordinary logs.
