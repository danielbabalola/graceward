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
  - Contact info, location, contacts, browsing/search history, purchases,
    financial info, health/fitness — none collected.
  - **No tracking:** the app does not track users across apps/sites and uses no
    analytics or advertising SDKs. The anonymous install ID below is **not** an
    advertising identifier and is not used for tracking. Declare **"Data Not
    Collected"** for tracking.

- **Data handled when the user initiates an AI action (declare carefully):**
  - **User Content (text)** — the selected typed reflection text is sent to
    Graceward's AI service (which calls a third-party AI provider) only when the
    user explicitly taps and consents. Disclose as User Content used for **App
    Functionality**, not linked to identity (there is no account), not used for
    tracking. Highlight that AI requests involve user content leaving the device
    to the app's service provider. This applies to the three AI endpoints:
    analyze reflection, transcribe reflection, and structure voice entry.
  - **Audio Data** — audio **is** now sent off-device for two user-initiated,
    consented actions: (1) transcribing a voice reflection, and (2) speaking to
    create a prayer/gratitude/faithfulness/lesson ("structured voice entry").
    Disclose Audio Data used for **App Functionality**, not linked to identity,
    not used for tracking. Note that audio is sent only on explicit user action,
    that journal-transcription audio remains on the device, and that
    structured-voice-entry audio is **discarded** after the entry is prepared and
    is **not** retained server-side or exported. Do **not** claim audio never
    leaves the device.
  - **Identifiers (anonymous install ID)** — on first AI use the app generates a
    random local ID (a UUID) and sends it **only with AI requests** via the
    `X-Graceward-Install-Id` header. It is used solely for **App Functionality** —
    abuse prevention, closed-beta per-install quotas, and cost control — and is
    **not** an account, **not** derived from device hardware identifiers, and
    **not** an advertising identifier. It is **not** used for tracking and is
    cleared by **Delete All Local Data** (a new ID is generated on the next AI
    action). If declaring under **Identifiers**, map it to **App Functionality**
    (fraud/abuse prevention), not linked to identity, not used for tracking.
    **Needs final review:** confirm whether Apple expects this abuse-prevention
    identifier to be declared under Identifiers or treated as exempt, and
    disclose accordingly before submission.

- **Local-only data (not "collected" under App Store definitions):**
  - Reflections, prayers, gratitudes, faithfulness moments, lessons, journal
    audio, and preferences live on the device. Local storage on the user's own
    device is generally not a disclosed "collection," but confirm against current
    Apple guidance at submission time. (Audio sent off-device for the two voice
    actions above is covered under Audio Data.)

- **Action items before submission:**
  - [ ] Confirm the AI provider's data handling/retention for the User Content
        **and audio** sent (transcription and structured voice entry), and
        reflect it accurately.
  - [ ] Decide how the anonymous install ID is declared (Identifiers → App
        Functionality / abuse prevention, not tracking) vs. treated as exempt,
        per current Apple guidance — keep it consistent with
        `docs/21_PRIVACY_POLICY_DRAFT.md` and `docs/11_SECURITY_AND_PRIVACY.md`.
  - [ ] Re-review every label if auth, cloud sync, or analytics are added later.
  - [ ] Keep labels conservative; do not overclaim privacy (audio Data Not
        Collected is no longer accurate now that transcription and structured
        voice entry ship).
  - [ ] This mapping is a draft, not final legal text; have it reviewed before
        submitting App Store privacy labels.

## Avoid

- Android references
- Play Store references
- Unsupported device screenshots
- Overclaiming privacy
- Overclaiming theological authority
- Medical/therapy claims
