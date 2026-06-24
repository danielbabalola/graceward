# 21 Privacy Policy (DRAFT — not legal advice)

> **Status: DRAFT.** This document describes how the current Graceward MVP
> handles data, written to inform a future privacy policy and the App Store
> privacy labels. It is **not** final legal text and **not** legal advice. Have
> it reviewed by a qualified professional before publishing or submitting to the
> App Store. Update it whenever app behavior changes (especially if auth, cloud
> sync, transcription, analytics, or subscriptions are added).

_Last updated: draft. Effective date: TBD._

## Summary

Graceward is a private, local-first Christian reflection app. In this version,
your reflections and recordings are stored on your device. Information leaves
your device only when **you** choose a specific action: when you run an AI
reflection (the selected reflection text is sent for analysis), when you
transcribe a voice reflection (that selected recording is sent to be converted
to text), or when you speak to create a prayer, gratitude, faithfulness moment,
or lesson (that selected recording is sent to be turned into text and organized
into the entry, then discarded). Nothing is sent automatically or in the
background. We do not claim that audio never leaves your device — selected audio
is sent for the voice actions you choose, and only then.

## What we store, and where

All of the following are stored **locally on your device** only:

- Journal reflections (typed text).
- Prayer requests.
- Gratitude entries.
- Faithfulness moments.
- Lessons (what you're learning or noticing with God).
- Voice recordings (audio files).
- Saved AI suggestions and app preferences.

There is **no account, no sign-in, no cloud sync, and no analytics** in this
version. We do not maintain a server-side copy of your reflections, prayers,
gratitudes, faithfulness moments, lessons, or audio.

## AI reflection (user-initiated)

- AI reflection is **manual**. It runs only when you explicitly choose it and
  confirm the on-screen notice — never automatically or in the background.
- When you run an AI reflection on a typed entry, the **selected typed
  reflection text** for that entry is sent over the network to Graceward's AI
  service, which uses a third-party AI provider to generate the response.
- The response (pastoral reflection and suggestions) is returned to your device.
  You decide what, if anything, to save.
- We do **not** claim that nothing is ever sent: the text you submit for an AI
  reflection does leave your device for this purpose.

## Voice recordings and transcription (journal reflections)

- Voice reflections are recorded and stored locally and used for playback on
  your device.
- Transcription is **manual and user-initiated**. A recording is **not**
  transcribed automatically. When you tap "Transcribe this reflection" and
  confirm the on-screen notice, **only that selected recording** is sent to
  Graceward's transcription service to be converted to text.
- The resulting transcript is saved **locally** on your device as part of that
  journal entry's text. You can edit it.
- Transcribing a journal recording does **not** delete it — your original audio
  stays on your device.
- The raw audio is sent only for transcription. AI reflection on a transcribed
  voice entry uses the **transcript text only**, never the raw audio.

## Speaking to create an entry (structured voice entry)

- On the create screens you can choose to **speak instead of typing** a prayer
  request, gratitude, faithfulness moment, or lesson.
- This is **manual and user-initiated**. When you tap "Use this recording" and
  confirm the on-screen notice, **only that selected recording** is sent to
  Graceward, where it is transcribed and organized into the entry's fields (for
  example, a prayer's title, details, and any follow-up date you actually
  spoke).
- The structured text is returned to your device, where **you review and edit
  it before saving**. The saved entry is stored locally like any typed entry.
- The recording for a structured voice entry is **not kept** on your device
  after the entry is prepared — it is **discarded**. It is **never** included in
  your data export.
- Graceward does not keep a server-side copy of the audio or transcript for this
  feature; they exist only for the duration of the request needed to prepare
  your entry.

## Exporting your data

- You can export your local data as a JSON file from within the app.
- The export includes your text-based content and journal audio **metadata
  only**. It does **not** include any raw audio files, and it does **not**
  include recordings used to create structured voice entries (those are
  discarded and never stored). Once a voice reflection has been transcribed, its
  transcript is part of that entry's text and is included in the export like any
  other journal text. Where you save or share the exported file is under your
  control via the system share sheet.

## Deleting your data

- You can delete your local data from within the app.
- Deleting permanently removes your local content (including any saved
  transcripts, which live within your journal text), your on-device audio files,
  and your app preferences (including the AI reflection, voice transcription, and
  voice-entry consent acknowledgements). This cannot be undone.
- Because there is no account or cloud copy, deleting on-device data removes it.

## Third parties

- Graceward's AI service relies on a third-party AI provider to generate
  reflections from the text you submit for AI analysis, to transcribe the voice
  recordings you choose to transcribe, and to transcribe and organize the
  recordings you speak to create an entry. Their handling of that text and audio
  is governed by their terms; confirm and disclose their data handling/retention
  before public launch.
- No advertising, tracking, or analytics SDKs are used in this version.

## Children's privacy

- Graceward is not directed to children. Confirm the appropriate age rating and
  any related requirements before submission.

## Changes to this policy

- This is a draft and will change as the app evolves. The effective date and
  contents must be finalized before public release.

## Contact

- Support contact / URL: **TBD** (required for App Store submission).
