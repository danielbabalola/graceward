import type { AnalyzableMode } from "@graceward/ai-schemas";

/**
 * A curated, server-only Scripture pack. This is the "RAG-lite" grounding for
 * the reflection's Scripture section: the model never writes verse text itself
 * — it only chooses the best-fitting entry's `id` from the candidates we inject
 * into the prompt, and the server resolves that id back to this canonical,
 * pre-vetted wording. That makes misquotation/fabrication structurally
 * impossible and is a clean stand-in for a real verse-retrieval system later.
 *
 * All text is the King James Version (KJV), which is public domain (no
 * licensing constraints) and was verified verse-by-verse against a public KJV
 * source when this pack was authored. Keep the set modest and pastoral.
 */
export type ScriptureEntry = {
  /** Stable slug used as the selection id (e.g. "psalm-23-1"). */
  id: string;
  /** Human-readable reference shown to the user (e.g. "Psalm 23:1"). */
  reference: string;
  /** Exact verse wording (KJV). Never edited at runtime. */
  text: string;
  /** Translation label shown with the verse. */
  translation: string;
  /** Theme words (prefer the shared CANONICAL_TAGS vocabulary). */
  themes: string[];
  /**
   * Reflection modes this verse fits. Omit to mean "fits any mode"; the
   * candidate builder includes universal entries for every mode.
   */
  modes?: AnalyzableMode[];
};

/** Translation used by every entry in this pack. */
export const SCRIPTURE_TRANSLATION = "KJV";

export const SCRIPTURE_PACK: readonly ScriptureEntry[] = [
  {
    id: "psalm-23-1",
    reference: "Psalm 23:1",
    text: "The LORD is my shepherd; I shall not want.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Trust", "Rest", "Provision"],
  },
  {
    id: "psalm-34-18",
    reference: "Psalm 34:18",
    text: "The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Grief", "Healing", "Hope"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "psalm-46-1",
    reference: "Psalm 46:1",
    text: "God is our refuge and strength, a very present help in trouble.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Trust", "Peace", "Grief"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "psalm-55-22",
    reference: "Psalm 55:22",
    text: "Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Trust", "Rest", "Peace"],
  },
  {
    id: "proverbs-3-5-6",
    reference: "Proverbs 3:5-6",
    text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Trust", "Guidance", "Wisdom"],
  },
  {
    id: "isaiah-40-31",
    reference: "Isaiah 40:31",
    text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Hope", "Rest", "Patience"],
  },
  {
    id: "isaiah-41-10",
    reference: "Isaiah 41:10",
    text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Trust", "Peace", "Hope"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "lamentations-3-22-23",
    reference: "Lamentations 3:22-23",
    text: "It is of the LORD'S mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Hope", "Faith", "Gratitude"],
  },
  {
    id: "matthew-6-33",
    reference: "Matthew 6:33",
    text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Provision", "Calling", "Guidance"],
    modes: ["regular", "free_flow", "rejoice"],
  },
  {
    id: "matthew-11-28-30",
    reference: "Matthew 11:28-30",
    text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest. Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls. For my yoke is easy, and my burden is light.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Rest", "Peace", "Hope"],
  },
  {
    id: "john-14-27",
    reference: "John 14:27",
    text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Peace", "Trust"],
  },
  {
    id: "john-16-33",
    reference: "John 16:33",
    text: "These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Peace", "Hope", "Trust"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "romans-8-28",
    reference: "Romans 8:28",
    text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Trust", "Hope", "Calling"],
  },
  {
    id: "1-corinthians-10-13",
    reference: "1 Corinthians 10:13",
    text: "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Faith", "Trust", "Hope"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "philippians-4-6-7",
    reference: "Philippians 4:6-7",
    text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Peace", "Trust", "Gratitude"],
  },
  {
    id: "1-thessalonians-5-16-18",
    reference: "1 Thessalonians 5:16-18",
    text: "Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Gratitude", "Hope", "Faith"],
    modes: ["rejoice", "regular", "free_flow"],
  },
  {
    id: "james-1-2-4",
    reference: "James 1:2-4",
    text: "My brethren, count it all joy when ye fall into divers temptations; Knowing this, that the trying of your faith worketh patience. But let patience have her perfect work, that ye may be perfect and entire, wanting nothing.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Patience", "Faith", "Hope"],
  },
  {
    id: "1-peter-5-7",
    reference: "1 Peter 5:7",
    text: "Casting all your care upon him; for he careth for you.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Trust", "Peace", "Rest"],
  },
  {
    id: "1-john-1-9",
    reference: "1 John 1:9",
    text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Forgiveness", "Repentance", "Hope"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "jeremiah-29-11",
    reference: "Jeremiah 29:11",
    text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Hope", "Guidance", "Trust"],
  },
  {
    id: "2-corinthians-12-9",
    reference: "2 Corinthians 12:9",
    text: "And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness. Most gladly therefore will I rather glory in my infirmities, that the power of Christ may rest upon me.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Healing", "Hope", "Faith"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "psalm-51-10",
    reference: "Psalm 51:10",
    text: "Create in me a clean heart, O God; and renew a right spirit within me.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Repentance", "Forgiveness", "Hope"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "psalm-30-5",
    reference: "Psalm 30:5",
    text: "For his anger endureth but a moment; in his favour is life: weeping may endure for a night, but joy cometh in the morning.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Grief", "Hope", "Healing"],
    modes: ["lament", "regular", "free_flow"],
  },
  {
    id: "joshua-1-9",
    reference: "Joshua 1:9",
    text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Calling", "Trust", "Hope"],
  },
  {
    id: "joshua-24-15",
    reference: "Joshua 24:15",
    text: "Choose you this day whom ye will serve... but as for me and my house, we will serve the LORD.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Family", "Calling", "Faith"],
  },
  {
    id: "psalm-127-3",
    reference: "Psalm 127:3",
    text: "Lo, children are an heritage of the LORD: and the fruit of the womb is his reward.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Family", "Gratitude", "Provision"],
  },
  {
    id: "proverbs-22-6",
    reference: "Proverbs 22:6",
    text: "Train up a child in the way he should go: and when he is old, he will not depart from it.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Family", "Guidance", "Patience"],
  },
  {
    id: "1-corinthians-13-4-7",
    reference: "1 Corinthians 13:4-7",
    text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth in the truth; Beareth all things, believeth all things, hopeth all things, endureth all things.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Marriage", "Friendship", "Patience"],
  },
  {
    id: "ecclesiastes-4-9-10",
    reference: "Ecclesiastes 4:9-10",
    text: "Two are better than one; because they have a good reward for their labour. For if they fall, the one will lift up his fellow: but woe to him that is alone when he falleth; for he hath not another to help him up.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Friendship", "Marriage", "Family"],
  },
  {
    id: "colossians-3-14",
    reference: "Colossians 3:14",
    text: "And above all these things put on charity, which is the bond of perfectness.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Marriage", "Friendship", "Family"],
  },
  {
    id: "proverbs-17-17",
    reference: "Proverbs 17:17",
    text: "A friend loveth at all times, and a brother is born for adversity.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Friendship", "Family"],
  },
  {
    id: "proverbs-27-17",
    reference: "Proverbs 27:17",
    text: "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Friendship", "Wisdom"],
  },
  {
    id: "colossians-3-23",
    reference: "Colossians 3:23",
    text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Work", "Calling"],
  },
  {
    id: "proverbs-16-3",
    reference: "Proverbs 16:3",
    text: "Commit thy works unto the LORD, and thy thoughts shall be established.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Work", "Guidance", "Trust"],
  },
  {
    id: "philippians-4-19",
    reference: "Philippians 4:19",
    text: "But my God shall supply all your need according to his riches in glory by Christ Jesus.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Provision", "Trust", "Hope"],
  },
  {
    id: "hebrews-13-5",
    reference: "Hebrews 13:5",
    text: "Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Provision", "Trust", "Rest"],
  },
  {
    id: "psalm-103-2-3",
    reference: "Psalm 103:2-3",
    text: "Bless the LORD, O my soul, and forget not all his benefits: Who forgiveth all thine iniquities; who healeth all thy diseases;",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Gratitude", "Healing", "Forgiveness"],
  },
  {
    id: "james-1-5",
    reference: "James 1:5",
    text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Wisdom", "Guidance"],
  },
  {
    id: "psalm-37-5",
    reference: "Psalm 37:5",
    text: "Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Guidance", "Trust"],
  },
  {
    id: "psalm-118-24",
    reference: "Psalm 118:24",
    text: "This is the day which the LORD hath made; we will rejoice and be glad in it.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Gratitude", "Hope"],
    modes: ["rejoice", "regular", "free_flow"],
  },
  {
    id: "psalm-100-4",
    reference: "Psalm 100:4",
    text: "Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.",
    translation: SCRIPTURE_TRANSLATION,
    themes: ["Gratitude"],
    modes: ["rejoice", "regular", "free_flow"],
  },
];

const SCRIPTURE_BY_ID: ReadonlyMap<string, ScriptureEntry> = new Map(
  SCRIPTURE_PACK.map((entry) => [entry.id, entry]),
);

/**
 * Resolves a model-chosen id back to its canonical entry, or null when the id
 * is missing, null, or not in the pack (e.g. the model hallucinated one). A
 * null result means the Scripture section is simply omitted — never fabricated.
 */
export function resolveScripture(
  id: string | null | undefined,
): ScriptureEntry | null {
  if (!id) {
    return null;
  }
  return SCRIPTURE_BY_ID.get(id) ?? null;
}

/**
 * The candidate entries to offer for a given reflection mode: every entry that
 * either targets this mode or is universal (no `modes` set).
 */
export function scriptureCandidatesForMode(
  mode: AnalyzableMode,
): ScriptureEntry[] {
  return SCRIPTURE_PACK.filter(
    (entry) => !entry.modes || entry.modes.includes(mode),
  );
}
