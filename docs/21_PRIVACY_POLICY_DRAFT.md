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
your reflections and recordings stay on your device. Information leaves your
device only when **you** choose it: when you run an AI reflection (the selected
reflection text is sent for analysis), or when you transcribe a voice reflection
(that selected recording is sent to be converted to text). Nothing is sent
automatically or in the background.

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

## Voice recordings and transcription

- Voice recordings are stored locally and used for playback on your device.
- Transcription is **manual and user-initiated**. A recording is **not**
  transcribed automatically. When you tap "Transcribe this reflection" and
  confirm the on-screen notice, **only that selected recording** is sent to
  Graceward's transcription service to be converted to text.
- The resulting transcript is saved **locally** on your device as part of that
  journal entry's text. You can edit it.
- Transcribing a recording does **not** delete it — your original audio stays on
  your device.
- The raw audio is sent only for transcription. AI reflection on a transcribed
  voice entry uses the **transcript text only**, never the raw audio.

## Exporting your data

- You can export your local data as a JSON file from within the app.
- The export includes your text-based content and audio **metadata only**. It
  does **not** include the raw audio files. Once a voice reflection has been
  transcribed, its transcript is part of that entry's text and is included in the
  export like any other journal text. Where you save or share the exported file
  is under your control via the system share sheet.

## Deleting your data

- You can delete your local data from within the app.
- Deleting permanently removes your local content (including any saved
  transcripts, which live within your journal text), your on-device audio files,
  and your app preferences (including the AI reflection and voice transcription
  consent acknowledgements). This cannot be undone.
- Because there is no account or cloud copy, deleting on-device data removes it.

## Third parties

- Graceward's AI service relies on a third-party AI provider to generate
  reflections from the text you submit for AI analysis, and to transcribe the
  voice recordings you choose to transcribe. Their handling of that text and
  audio is governed by their terms; confirm and disclose their data
  handling/retention before public launch.
- No advertising, tracking, or analytics SDKs are used in this version.

## Children's privacy

- Graceward is not directed to children. Confirm the appropriate age rating and
  any related requirements before submission.

## Changes to this policy

- This is a draft and will change as the app evolves. The effective date and
  contents must be finalized before public release.

## Contact

- Support contact / URL: **TBD** (required for App Store submission).
