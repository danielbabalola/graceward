# 02 User Flows

## Main Reflection Flow

The first decision should be the reflection style, not the input method.

```text
New Reflection
│
├── Free Flow
│   ├── Speak
│   └── Type
│
└── Guided Reflection
    ├── Regular Reflection
    │   ├── Speak
    │   └── Type
    │
    ├── Lament
    │   ├── Speak
    │   └── Type
    │
    └── Rejoice
        ├── Speak
        └── Type
```

## Why This Order

The user intent comes before the input mechanism.

Bad order:

```text
Speak or Type -> What mode?
```

Better order:

```text
Free Flow or Guided -> Speak or Type
```

This helps users answer the deeper question first:

> Do I want to ramble freely or be guided?

## Flow 1: Free Flow Speak

1. User taps New Reflection.
2. User chooses Free Flow.
3. User chooses Speak.
4. App opens voice recorder.
5. User records up to 15 minutes.
6. User can pause, stop, discard, or save.
7. Entry saves locally.
8. User can choose "Reflect with AI."
9. Audio uploads for transcription if needed.
10. Transcript is generated.
11. AI analyzes entry.
12. App displays summary, prayer points, gratitudes, biblical reflection, and follow-up.
13. User can edit and save outputs.

## Flow 2: Free Flow Type

1. User taps New Reflection.
2. User chooses Free Flow.
3. User chooses Type.
4. App opens open-ended writing screen.
5. User types freely.
6. Entry saves locally.
7. User can submit for AI reflection.
8. AI generates structured outputs.

## Flow 3: Guided Regular Reflection

Prompts:

- What happened today?
- What felt heavy?
- What felt good?
- Where did you notice God's grace?
- Did anything reveal something about your heart?
- Is there anything you need to confess, surrender, or revisit?
- What do you want to pray about?

User may answer by voice or text.

## Flow 4: Guided Lament

Framework:

1. Turn to God
2. Bring the complaint
3. Ask boldly
4. Remember God's character
5. Choose trust

Prompts:

- What happened?
- What feels painful, unfair, confusing, or heavy?
- What do you wish God would do?
- What do you know is still true about God?
- What would trust look like today?

Important:

The app should not rush the user out of grief.

## Flow 5: Guided Rejoice

Prompts:

- What good thing happened today?
- What prayer may God be answering?
- What ordinary mercy did you experience?
- Who did God use to bless you?
- What does this reveal about God's care?

## Home / Today Flow

Today screen contains:

- Start Reflection
- Continue Draft
- Today's Prayer Focus
- Recent Gratitude
- Follow-Up Prompt
- Weekly Review Card when available
- Reminder of a past answered prayer or gratitude

## Journal Flow

Journal has three views:

### 1. Timeline View

Default recent entries list.

Each card shows:

- Date
- Mode
- Input type
- Short summary
- Tone
- Tags/themes
- Prayer/gratitude indicators

### 2. Calendar View

Monthly calendar.

Days can show indicators:

- Entry dot
- Prayer indicator
- Gratitude indicator
- Answered prayer/win indicator
- Lament/rejoice accent

### 3. Search / Filter View

Search by:

- Keyword
- Date
- Mode
- Mood/tone
- Prayer requests
- Gratitude
- Lessons
- Answered prayers
- Scripture references
- Tags

## Prayer Flow

1. User opens Prayer.
2. User sees Active, Answered, Archived.
3. User can add request manually.
4. AI can suggest a request from an entry.
5. User confirms before suggestion becomes an active request.
6. User can mark prayer answered.
7. Answered prayer can appear in Faithfulness timeline.

## Gratitude Flow

1. User opens Gratitude.
2. User sees daily gratitudes and wins.
3. User can add gratitude manually.
4. AI can suggest gratitude from entries.
5. User can view Faithfulness timeline inside Gratitude.
6. User can browse by date or theme.

## Review Flow

Review should not be a bottom tab in MVP.

It appears as:

- Weekly Review Card on Today
- Monthly Review Card later
- Optional entry point inside Journal

Review contains:

- Recurring themes
- Lessons
- Answered prayers
- Gratitude patterns
- Follow-ups
- Growth areas

## Settings Flow

Settings contains:

- Profile
- Privacy
- AI memory
- Audio retention
- Cloud sync
- Notifications
- Export data
- Delete account
- Subscription
- Feedback
