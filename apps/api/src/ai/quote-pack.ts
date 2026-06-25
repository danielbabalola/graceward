import type { AnalyzableMode } from "@graceward/ai-schemas";

/**
 * A curated, server-only pack of Christian quotes/thoughts. Like the Scripture
 * pack, this is "RAG-lite": the model only chooses the best-fitting entry's
 * `id` from candidates we inject, and the server resolves it to this canonical,
 * pre-vetted wording and attribution. This guarantees accuracy and prevents the
 * classic LLM failure mode of misattributing or fabricating quotes.
 *
 * Every entry's wording, author, and source were verified against primary or
 * authoritative sources when this pack was authored. Keep additions to quotes
 * you can verify the same way — a wrong attribution is worse than no quote.
 */
export type QuoteEntry = {
  /** Stable slug used as the selection id (e.g. "augustine-restless"). */
  id: string;
  /** Exact quote wording. Never edited at runtime. */
  text: string;
  /** Attributed author. */
  author: string;
  /** Optional work the quote is from. */
  source?: string;
  /** Theme words (prefer the shared CANONICAL_TAGS vocabulary). */
  themes: string[];
  /** Reflection modes this quote fits. Omit to mean "fits any mode". */
  modes?: AnalyzableMode[];
};

export const QUOTE_PACK: readonly QuoteEntry[] = [
  {
    id: "augustine-restless",
    text: "You have made us for yourself, O Lord, and our heart is restless until it rests in you.",
    author: "Augustine of Hippo",
    source: "Confessions",
    themes: ["Rest", "Trust", "Peace"],
  },
  {
    id: "ten-boom-unknown-future",
    text: "Never be afraid to trust an unknown future to a known God.",
    author: "Corrie ten Boom",
    themes: ["Trust", "Hope", "Faith"],
  },
  {
    id: "lewis-megaphone",
    text: "God whispers to us in our pleasures, speaks in our conscience, but shouts in our pain: it is His megaphone to rouse a deaf world.",
    author: "C. S. Lewis",
    source: "The Problem of Pain",
    themes: ["Grief", "Patience", "Faith"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "keller-known-loved",
    text: "To be loved but not known is comforting but superficial. To be known and not loved is our greatest fear. But to be fully known and truly loved is, well, a lot like being loved by God.",
    author: "Timothy Keller",
    source: "The Meaning of Marriage",
    themes: ["Marriage", "Friendship", "Faith"],
  },
  {
    id: "tozer-think-about-god",
    text: "What comes into our minds when we think about God is the most important thing about us.",
    author: "A. W. Tozer",
    source: "The Knowledge of the Holy",
    themes: ["Faith", "Wisdom"],
  },
  {
    id: "jim-elliot-no-fool",
    text: "He is no fool who gives what he cannot keep to gain that which he cannot lose.",
    author: "Jim Elliot",
    themes: ["Calling", "Faith", "Hope"],
  },
  {
    id: "elisabeth-elliot-god-is-god",
    text: "God is God. Because he is God, he is worthy of my trust and obedience.",
    author: "Elisabeth Elliot",
    themes: ["Trust", "Guidance", "Rest"],
  },
  {
    id: "brother-lawrence-little-things",
    text: "We ought not to be weary of doing little things for the love of God, who regards not the greatness of the work, but the love with which it is performed.",
    author: "Brother Lawrence",
    source: "The Practice of the Presence of God",
    themes: ["Work", "Calling", "Patience"],
  },
  {
    id: "lewis-friendship",
    text: "Friendship is born at that moment when one man says to another, \"What! You too? I thought that no one but myself...\"",
    author: "C. S. Lewis",
    source: "The Four Loves",
    themes: ["Friendship"],
  },
  {
    id: "lewis-love-vulnerable",
    text: "To love at all is to be vulnerable.",
    author: "C. S. Lewis",
    source: "The Four Loves",
    themes: ["Marriage", "Friendship", "Grief"],
  },
  {
    id: "hudson-taylor-supply",
    text: "God's work, done in God's way, will never lack God's supply.",
    author: "Hudson Taylor",
    themes: ["Provision", "Work", "Trust"],
  },
  {
    id: "buechner-vocation",
    text: "The place God calls you to is the place where your deep gladness and the world's deep hunger meet.",
    author: "Frederick Buechner",
    source: "Wishful Thinking",
    themes: ["Calling", "Work", "Guidance"],
  },
];

const QUOTE_BY_ID: ReadonlyMap<string, QuoteEntry> = new Map(
  QUOTE_PACK.map((entry) => [entry.id, entry]),
);

/**
 * Resolves a model-chosen id back to its canonical entry, or null when the id
 * is missing, null, or not in the pack. A null result simply omits the quote
 * section — never fabricates one.
 */
export function resolveQuote(id: string | null | undefined): QuoteEntry | null {
  if (!id) {
    return null;
  }
  return QUOTE_BY_ID.get(id) ?? null;
}

/**
 * The candidate entries to offer for a given reflection mode: every entry that
 * either targets this mode or is universal (no `modes` set).
 */
export function quoteCandidatesForMode(mode: AnalyzableMode): QuoteEntry[] {
  return QUOTE_PACK.filter((entry) => !entry.modes || entry.modes.includes(mode));
}
