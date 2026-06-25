import type { TaggableEntryType } from "@graceward/shared";
import {
  getGratitudeById,
  getInstructionById,
  getJournalEntryById,
  getLessonById,
  getPrayerRequestById,
  getWinById,
  listEntryRefsForTag,
} from "@/lib/db";
import { contentPreview } from "@/lib/gratitude-display";

export type TaggedEntryListItem = {
  entryType: TaggableEntryType;
  entryId: string;
  /** Short label shown for the entry (title or content preview). */
  label: string;
  /** Human-readable name for the entry's type. */
  typeLabel: string;
  createdAt: string;
};

const TYPE_LABELS: Record<TaggableEntryType, string> = {
  gratitude: "Gratitude",
  win: "Testimony",
  lesson: "Lesson",
  instruction: "Instruction",
  prayer_request: "Prayer",
  journal_entry: "Reflection",
};

/** The detail route for a tagged entry of the given type. */
export const ENTRY_ROUTES: Record<TaggableEntryType, string> = {
  gratitude: "/gratitude/[id]",
  win: "/win/[id]",
  lesson: "/lesson/[id]",
  instruction: "/instruction/[id]",
  prayer_request: "/prayer/[id]",
  journal_entry: "/journal/[id]",
};

async function resolveLabel(
  entryType: TaggableEntryType,
  entryId: string,
): Promise<string | null> {
  switch (entryType) {
    case "gratitude": {
      const row = await getGratitudeById(entryId);
      return row ? contentPreview(row.content) : null;
    }
    case "win": {
      const row = await getWinById(entryId);
      return row ? contentPreview(row.content) : null;
    }
    case "lesson": {
      const row = await getLessonById(entryId);
      return row ? row.title : null;
    }
    case "instruction": {
      const row = await getInstructionById(entryId);
      return row ? row.title : null;
    }
    case "prayer_request": {
      const row = await getPrayerRequestById(entryId);
      return row ? row.title : null;
    }
    case "journal_entry": {
      const row = await getJournalEntryById(entryId);
      return row ? (row.title ?? "Reflection") : null;
    }
    default:
      return null;
  }
}

/**
 * Resolves every entry carrying a tag into a display row, across all content
 * types. Entries that no longer exist (e.g. soft-deleted) are skipped.
 */
export async function listTaggedEntriesForTag(
  tagId: string,
): Promise<TaggedEntryListItem[]> {
  const refs = await listEntryRefsForTag(tagId);
  const items: TaggedEntryListItem[] = [];
  for (const ref of refs) {
    const label = await resolveLabel(ref.entryType, ref.entryId);
    if (label === null) {
      continue;
    }
    items.push({
      entryType: ref.entryType,
      entryId: ref.entryId,
      label,
      typeLabel: TYPE_LABELS[ref.entryType],
      createdAt: ref.createdAt,
    });
  }
  return items;
}
