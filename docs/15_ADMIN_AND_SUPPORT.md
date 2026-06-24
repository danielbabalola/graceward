# 15 Admin and Support

## Admin Philosophy

Admin tools should help support users without casually exposing private spiritual content.

## MVP Admin Capabilities

- User lookup
- Subscription status
- Usage status
- AI job status
- Transcription job status
- Error logs
- Feedback board
- Account deletion status
- Export request status

## Sensitive Data Rule

Raw journal content should not be visible by default.

If access is ever needed:

- Require elevated role.
- Require reason.
- Log audit event.
- Prefer user consent.
- Show minimum necessary content.

## Admin Actions

Possible actions:

- View user metadata
- View entitlement status
- View usage events
- Retry failed AI job
- Retry failed transcription
- Mark support ticket status
- Trigger export
- Confirm deletion status

## Audit Logs

Track:

- admin_user_id
- target_user_id
- action
- reason
- metadata
- timestamp
- ip address

## Failure Simulation

Future admin/testing tools should simulate:

- server down
- database down
- AI provider down
- transcription provider down
- storage down
- payment provider down
- sync failure
