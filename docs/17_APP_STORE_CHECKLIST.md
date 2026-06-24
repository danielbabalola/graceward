# 17 App Store Checklist

## App Name

Working:

**Graceward: Daily Reflection**

## Subtitle Ideas

- Prayer, gratitude, reflection
- Reflect with prayer and Scripture
- Daily Christian reflection

## Required URLs

- Privacy Policy
- Terms of Use
- Support URL

## Required Features

- Account deletion if account creation exists
- Data export recommended
- Privacy controls
- Clear subscription terms if paid
- No references to unsupported platforms
- Screenshots must match iOS app experience

## App Privacy Labels

Prepare data categories carefully:

- User content
- Audio data
- Identifiers
- Usage data
- Diagnostics

Be accurate and conservative.

## Review Notes

Include:

- Test account if needed
- How to access core features
- Explanation of AI-generated reflection
- Subscription details if applicable
- Account deletion location

## Screenshots

Show:

1. Today screen
2. Free Flow reflection
3. Guided Reflection
4. Prayer points
5. Gratitude/Faithfulness
6. Journal calendar
7. Privacy settings

## App Privacy Label Mapping (Draft — needs review)

Maps the **current MVP behavior** to App Store privacy disclosure categories.
This is a draft to fill in App Store Connect "App Privacy"; review before
submission. See `docs/21_PRIVACY_POLICY_DRAFT.md` for the matching narrative.

- **Data NOT collected (no account, no cloud sync, no analytics in the MVP):**
  - Contact info, identifiers, location, contacts, browsing/search history,
    purchases, financial info, health/fitness — none collected.
  - **No tracking:** the app does not track users across apps/sites and uses no
    analytics or advertising SDKs. Declare **"Data Not Collected"** for tracking.

- **Data handled when the user initiates AI reflection (declare carefully):**
  - **User Content** — the selected typed reflection text is sent to Graceward's
    AI service (which calls a third-party AI provider) only when the user
    explicitly taps and consents. Disclose as User Content used for **App
    Functionality**, not linked to identity (there is no account), not used for
    tracking. Highlight that AI requests involve user content leaving the device
    to the app's service provider.
  - Voice recordings (Audio Data) stay **on device**, are not transcribed, and
    are **not** sent for AI yet — so audio is not "collected" off-device today.
    Re-evaluate this label when transcription ships.

- **Local-only data (not "collected" under App Store definitions):**
  - Reflections, prayers, gratitudes, faithfulness moments, audio, and
    preferences live only on the device. Local storage on the user's own device
    is generally not a disclosed "collection," but confirm against current
    Apple guidance at submission time.

- **Action items before submission:**
  - [ ] Confirm the AI provider's data handling/retention for the User Content
        sent, and reflect it accurately.
  - [ ] Re-review every label if auth, cloud sync, transcription, or analytics
        are added later.
  - [ ] Keep labels conservative; do not overclaim privacy.

## Avoid

- Android references
- Play Store references
- Unsupported device screenshots
- Overclaiming privacy
- Overclaiming theological authority
- Medical/therapy claims
