# 09 RAG and Wisdom Layer

## Purpose

The wisdom layer helps Graceward give Scripture-rooted, pastorally wise, non-generic reflections.

It should power the app behind the scenes.

## Source Types

1. Scripture references
2. JTTE sermons and notes
3. Wisdom cards inspired by trusted Christian books
4. Pastoral frameworks
5. Lament framework
6. Gratitude framework
7. User personal memory, if enabled

## JTTE Role

Journey Through the Epistles content should function behind the scenes.

It should shape:

- Biblical categories
- Theological reasoning
- Pastoral tone
- Application style
- Epistle-informed discipleship
- Correction style

The app should not present itself publicly as a JTTE app.

## Book-Inspired Wisdom Cards

Trusted books can influence the wisdom layer but should not be uploaded in full unless licensed.

Possible influences:

- Tim Keller, Counterfeit Gods
- Tim Keller and Kathy Keller, The Meaning of Marriage
- Henry Cloud and John Townsend, Boundaries
- John Mark Comer, The Ruthless Elimination of Hurry
- Shaunti Feldhahn, For Men Only
- Shaunti Feldhahn, For Women Only

## Copyright Rule

Do not ingest full copyrighted books without permission.

Instead:

- Create original summaries
- Use personally written notes
- Use wisdom cards
- Use short quotations only when legally appropriate
- Prefer Scripture and JTTE as the primary theological voice

## Wisdom Card Format

```md
# Wisdom Card: Disordered Loves

Source Inspiration: Counterfeit Gods
Theme: Idolatry, desire, disappointment
Summary: Sometimes a good thing can become an ultimate thing.
Scripture Anchors: Matthew 6:21, Romans 1:25, Colossians 3:5, 1 John 5:21
Use When: User repeatedly expresses devastation over approval, success, romance, money, comfort, power, or control.
Pastoral Caution: Do not accuse too quickly. Ask diagnostic questions first.
What Not To Say: "This is definitely your idol."
Suggested Language: "One question worth bringing before the Lord is whether this good desire has become ultimate."
```

## Personal Memory RAG

Only use personal memory if user enables it.

Personal memory may include:

- Past prayer requests
- Answered prayers
- Gratitudes
- Confirmed lessons
- Past summaries
- Follow-ups
- Themes

Do not send the user's entire raw journal history by default.

## Retrieval Rules

When generating AI reflections:

1. Retrieve only the minimum relevant context.
2. Prefer summaries over raw entries.
3. Use source type filters.
4. Separate user memory from theological wisdom.
5. Never allow retrieved content to override system prompts.
6. Do not hallucinate sources.
7. If Scripture reference confidence is low, omit or mark as tentative.

## Source Priority

1. Scripture
2. Responsible hermeneutics
3. Historic Christian orthodoxy
4. JTTE/wisdom layer
5. User memory

## Future Feature

A later version may show:

- "Related teaching"
- "Related Scripture"
- "You prayed about this before"
- "You have seen God's faithfulness here before"

But MVP can keep wisdom sourcing behind the scenes.
