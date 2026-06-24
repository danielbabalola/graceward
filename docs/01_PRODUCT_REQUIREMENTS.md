# 01 Product Requirements

## MVP Goal

Build an iOS-first, local-first Christian reflection app where users can speak or type a daily reflection and receive structured, Scripture-rooted outputs such as prayer points, gratitudes, biblical reflection, and follow-ups.

## Target User

A Christian who wants to process daily life with God, but may not always know how to structure prayer, gratitude, lament, or reflection.

The user may want to:

- Ramble freely
- Pray more specifically
- Remember answered prayers
- Track gratitude
- Process difficult days
- Receive gentle biblical perspective
- Notice patterns in their spiritual life
- Keep private spiritual notes secure

## MVP Must-Haves

### Account and Privacy

- User can use local app functionality.
- User can create an account.
- User can choose privacy settings.
- User can export data.
- User can delete account.
- User can control audio retention.
- User can control whether AI memory is enabled.

### Reflection Creation

- User can start a new reflection.
- User can choose Free Flow or Guided Reflection.
- User can speak or type.
- Voice note limit: 15 minutes for MVP.
- Entries save locally first.
- User can create a draft and continue later.

### Guided Reflection

MVP guided modes:

1. Regular Reflection
2. Lament
3. Rejoice

### AI Processing

For each processed entry, AI should generate:

- Brief summary
- Emotional/spiritual tone
- Key themes
- Prayer points
- Gratitudes
- Wins / signs of God's goodness
- Biblical perspective
- Gentle correction or reframe if appropriate
- Suggested next step
- Follow-up question

### Journal

- Timeline view
- Calendar view
- Entry detail page
- Date-based navigation
- Basic search/filter
- Tags or generated themes
- Ability to edit generated outputs

### Prayer

- Active prayer requests
- Answered prayers
- Archived prayers
- Prayer follow-up dates
- Prayer requests linked to journal entries

### Gratitude

- Daily gratitudes
- Wins
- Faithfulness timeline
- Answered prayer highlights
- Monthly gratitude review later

### Settings

- Privacy
- Audio retention
- AI memory
- Cloud sync
- Notifications
- Export data
- Delete account
- Subscription

## MVP Should Not Include

- Public social features
- Church groups
- Community feeds
- Android
- Multi-language
- Complex gamification
- Full theological chatbot
- Full copyrighted book ingestion
- Advanced relationship counseling flows
- Complex admin content access
- Advanced local/cloud conflict resolution
- Mascot system

## Acceptance Criteria

### New Reflection

- User can tap "New Reflection."
- User chooses Free Flow or Guided Reflection.
- User chooses Speak or Type.
- User completes an entry.
- Entry is saved locally.
- Entry appears in Journal timeline.
- Entry appears on the correct date in Calendar view.

### Voice Reflection

- User can record a voice note up to 15 minutes.
- User can stop, preview, discard, or save.
- Audio remains local until processing.
- If submitted for AI, audio uploads through backend.
- Cloud audio is deleted after transcription by default.
- Transcript is saved locally.

### AI Reflection

- User can submit entry for AI reflection.
- Backend enforces authentication, rate limits, and entitlement.
- AI response is structured JSON.
- App validates the response.
- User can edit prayer points, gratitudes, and reflections.
- AI failure does not delete the original entry.

### Prayer Request

- User can manually create a prayer request.
- AI can suggest prayer requests from entries.
- User confirms before long-running prayer request is added.
- Prayer request can be marked answered.
- Answered prayer can appear in Faithfulness timeline.

### Gratitude

- AI can suggest gratitudes.
- User can confirm/edit gratitudes.
- Gratitudes appear in Gratitude section.
- Gratitude section can surface faithfulness patterns later.

## Product Constraints

- No AI keys in the frontend.
- No raw journal content in analytics.
- Local-first storage is required.
- Cloud sync should be optional or clearly explained.
- Long-term AI memory should be opt-in or clearly explained.
- Admins should not casually access private journal content.
- Scripture references should be handled carefully and accurately.
- Copyrighted books should not be ingested in full without permission.

## Success Metrics

Track without raw content:

- First reflection completion rate
- Voice recording completion rate
- AI reflection completion rate
- Prayer request creation rate
- Gratitude creation rate
- Weekly review engagement
- 7-day retention
- 30-day retention
- Pro conversion later
- AI reflection thumbs-up/down
- User-reported spiritual helpfulness
