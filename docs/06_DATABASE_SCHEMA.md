# 06 Database Schema

## Schema Philosophy

Graceward uses:

1. Local SQLite for primary private app data.
2. Supabase Postgres for auth-linked profiles, optional sync, AI jobs, subscription state, usage, audit logs, and curated wisdom sources.

Local schema is the source of truth for device-first experiences.

## Common Fields

Most local tables should include:

- id
- local_id if needed
- user_id if authenticated
- sync_status
- created_at
- updated_at
- deleted_at

Use soft deletes for syncable data.

## Local Tables

### journal_entries

Fields:

- id
- user_id
- entry_date
- reflection_path: free_flow | guided
- mode: free_flow | regular | lament | rejoice | conflict | decision | relationship | gratitude | scripture_meditation
- input_type: text | voice | mixed
- raw_text
- title
- mood
- emotional_tone
- spiritual_tone
- status: draft | saved | processing | processed | failed
- sync_status
- cloud_id
- created_at
- updated_at
- deleted_at

Indexes:

- entry_date
- mode
- created_at
- sync_status

### audio_assets

Fields:

- id
- journal_entry_id
- local_file_path
- cloud_storage_path
- duration_seconds
- file_size_bytes
- mime_type
- transcription_status: none | pending | processing | complete | failed
- retention_policy: delete_after_transcription | keep_device_only | encrypted_cloud_backup
- sync_status
- created_at
- deleted_at

Indexes:

- journal_entry_id
- transcription_status

### transcripts

Fields:

- id
- journal_entry_id
- transcript_text
- provider
- confidence
- created_at
- updated_at
- sync_status

Indexes:

- journal_entry_id

### ai_outputs

Fields:

- id
- journal_entry_id
- summary
- emotional_tone
- spiritual_tone
- key_themes_json
- biblical_reflection
- gentle_correction
- next_step
- follow_up_question
- model_provider
- model_name
- prompt_version
- created_at
- updated_at
- sync_status

Indexes:

- journal_entry_id
- prompt_version

### prayer_requests

Fields:

- id
- title
- description
- source_journal_entry_id
- status: active | answered | archived
- follow_up_at
- answered_at
- answer_description
- created_at
- updated_at
- deleted_at
- sync_status

Indexes:

- status
- follow_up_at
- source_journal_entry_id

### prayer_points

Fields:

- id
- journal_entry_id
- prayer_request_id
- content
- created_at
- updated_at
- sync_status

Indexes:

- journal_entry_id
- prayer_request_id

### gratitudes

Fields:

- id
- journal_entry_id
- content
- category
- created_at
- updated_at
- sync_status

Indexes:

- journal_entry_id
- created_at

### wins

Fields:

- id
- journal_entry_id
- content
- faithfulness_theme
- created_at
- updated_at
- sync_status

Indexes:

- journal_entry_id
- faithfulness_theme

### lessons

Fields:

- id
- journal_entry_id
- content
- theme
- confirmed_by_user
- created_at
- updated_at
- sync_status

Indexes:

- journal_entry_id
- theme
- confirmed_by_user

### follow_ups

Fields:

- id
- source_journal_entry_id
- question
- follow_up_at
- status: pending | completed | dismissed
- completed_at
- created_at
- updated_at
- sync_status

Indexes:

- follow_up_at
- status
- source_journal_entry_id

### local_settings

Fields:

- id
- key
- value
- created_at
- updated_at

### sync_queue

Fields:

- id
- operation_type: create | update | delete
- entity_type
- entity_id
- payload_json
- status: pending | processing | failed | complete
- attempts
- last_error
- created_at
- updated_at

Indexes:

- status
- entity_type
- created_at

## Cloud Tables

### profiles

Fields:

- id
- user_id
- display_name
- timezone
- preferred_bible_translation
- theological_tone
- onboarding_completed_at
- created_at
- updated_at

### synced_records

For optional encrypted sync.

Fields:

- id
- user_id
- entity_type
- local_id
- encrypted_payload
- payload_version
- deleted_at
- created_at
- updated_at

Indexes:

- user_id
- entity_type
- local_id

### ai_jobs

Fields:

- id
- user_id
- journal_entry_local_id
- job_type: transcription | entry_analysis | weekly_review | monthly_review
- status: queued | processing | complete | failed
- attempts
- last_error
- prompt_version
- model_provider
- model_name
- created_at
- updated_at

Indexes:

- user_id
- status
- job_type
- created_at

### subscriptions

Fields:

- id
- user_id
- platform
- product_id
- status
- current_period_end
- created_at
- updated_at

### usage_events

Fields:

- id
- user_id
- event_type
- quantity
- metadata_json
- created_at

Indexes:

- user_id
- event_type
- created_at

### source_documents

Fields:

- id
- title
- source_type: scripture | jtte | wisdom_card | pastoral_framework
- citation
- copyright_status
- created_at

### source_chunks

Fields:

- id
- source_document_id
- content
- metadata_json
- created_at

### embeddings

Fields:

- id
- source_chunk_id
- user_id nullable
- embedding
- embedding_model
- created_at

### audit_logs

Fields:

- id
- actor_user_id
- target_user_id
- action
- metadata_json
- ip_address
- created_at

### feedback_items

Fields:

- id
- user_id
- category
- message
- status
- created_at

## Migration Rules

1. Use versioned migrations.
2. Never manually edit production schema.
3. Never modify a migration after it has been applied.
4. Add constraints early.
5. Add indexes intentionally.
6. Test migrations locally and in staging.
7. Use expand-and-contract for breaking changes.
8. Back up before risky production migrations.
