import * as Crypto from "expo-crypto";
import type {
  Tag,
  TaggableEntryType,
  TaggedEntryRef,
  TagWithCount,
} from "@graceward/shared";
import {
  dedupeTagNames,
  diffEntryTagIds,
  normalizeTagName,
  normalizeTagSlug,
  sameTagNameSet,
} from "@/lib/tag-normalize";
import { getDatabase } from "./client";

export {
  dedupeTagNames,
  normalizeTagName,
  normalizeTagSlug,
  sameTagNameSet,
} from "@/lib/tag-normalize";

type TagRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function mapRow(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** All tags currently applied to at least one entry, never-empty included. */
export async function listAllTags(): Promise<Tag[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow>(
    `SELECT * FROM tags WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC`,
  );
  return rows.map(mapRow);
}

/** All tags with how many non-deleted entries currently carry each. */
export async function listTagsWithCounts(): Promise<TagWithCount[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow & { count: number }>(
    `SELECT t.*, COUNT(et.id) AS count
       FROM tags t
       LEFT JOIN entry_tags et
         ON et.tag_id = t.id AND et.deleted_at IS NULL
      WHERE t.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.name COLLATE NOCASE ASC`,
  );
  return rows.map((row) => ({ ...mapRow(row), count: row.count }));
}

export async function getTagById(id: string): Promise<Tag | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TagRow>(
    `SELECT * FROM tags WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapRow(row) : null;
}

/**
 * Finds an existing tag by slug (reviving it if it had been soft-deleted) or
 * creates a new one. Returns null only for blank input.
 */
export async function upsertTagByName(name: string): Promise<Tag | null> {
  const db = await getDatabase();
  return upsertTagByNameWithDb(db, name);
}

async function upsertTagByNameWithDb(
  db: Awaited<ReturnType<typeof getDatabase>>,
  name: string,
): Promise<Tag | null> {
  const cleanName = normalizeTagName(name);
  if (!cleanName) {
    return null;
  }
  const slug = normalizeTagSlug(cleanName);
  const nowIso = new Date().toISOString();

  const existing = await db.getFirstAsync<TagRow>(
    `SELECT * FROM tags WHERE slug = ?`,
    [slug],
  );
  if (existing) {
    if (existing.deleted_at !== null) {
      await db.runAsync(
        `UPDATE tags SET deleted_at = NULL, updated_at = ? WHERE id = ?`,
        [nowIso, existing.id],
      );
      return { ...mapRow(existing), deletedAt: null, updatedAt: nowIso };
    }
    return mapRow(existing);
  }

  const tag: Tag = {
    id: Crypto.randomUUID(),
    name: cleanName,
    slug,
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO tags (id, name, slug, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, NULL)`,
    [tag.id, tag.name, tag.slug, tag.createdAt, tag.updatedAt],
  );
  return tag;
}

/** Tags applied to a single entry, ordered by name. */
export async function listTagsForEntry(
  entryType: TaggableEntryType,
  entryId: string,
): Promise<Tag[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow>(
    `SELECT t.* FROM tags t
       JOIN entry_tags et ON et.tag_id = t.id
      WHERE et.entry_type = ? AND et.entry_id = ?
        AND et.deleted_at IS NULL AND t.deleted_at IS NULL
      ORDER BY t.name COLLATE NOCASE ASC`,
    [entryType, entryId],
  );
  return rows.map(mapRow);
}

/**
 * Batched lookup of tags for many entries of one type. Returns a map keyed by
 * entry id (entries with no tags are simply absent from the map).
 */
export async function listTagsForEntries(
  entryType: TaggableEntryType,
  entryIds: string[],
): Promise<Map<string, Tag[]>> {
  const result = new Map<string, Tag[]>();
  if (entryIds.length === 0) {
    return result;
  }
  const db = await getDatabase();
  const placeholders = entryIds.map(() => "?").join(", ");
  const rows = await db.getAllAsync<TagRow & { entry_id: string }>(
    `SELECT t.*, et.entry_id AS entry_id FROM tags t
       JOIN entry_tags et ON et.tag_id = t.id
      WHERE et.entry_type = ? AND et.entry_id IN (${placeholders})
        AND et.deleted_at IS NULL AND t.deleted_at IS NULL
      ORDER BY t.name COLLATE NOCASE ASC`,
    [entryType, ...entryIds],
  );
  for (const row of rows) {
    const list = result.get(row.entry_id) ?? [];
    list.push(mapRow(row));
    result.set(row.entry_id, list);
  }
  return result;
}

/** Cross-type references for every entry currently carrying a tag. */
export async function listEntryRefsForTag(
  tagId: string,
): Promise<TaggedEntryRef[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    entry_type: string;
    entry_id: string;
    created_at: string;
  }>(
    `SELECT entry_type, entry_id, created_at FROM entry_tags
      WHERE tag_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC`,
    [tagId],
  );
  return rows.map((row) => ({
    entryType: row.entry_type as TaggableEntryType,
    entryId: row.entry_id,
    createdAt: row.created_at,
  }));
}

/** Entry ids of one type that carry a tag — used to filter a single list. */
export async function listEntryIdsForTagByType(
  tagId: string,
  entryType: TaggableEntryType,
): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ entry_id: string }>(
    `SELECT entry_id FROM entry_tags
      WHERE tag_id = ? AND entry_type = ? AND deleted_at IS NULL`,
    [tagId, entryType],
  );
  return rows.map((row) => row.entry_id);
}

/**
 * Replaces the full set of tags on an entry. Names are deduped (case/spacing
 * insensitive); links no longer present are removed, new ones are inserted.
 * Removal is a hard delete of the join row (it carries no content of its own),
 * which keeps the (entry, tag) uniqueness invariant clean for re-adds.
 */
export async function setEntryTags(
  entryType: TaggableEntryType,
  entryId: string,
  names: string[],
): Promise<void> {
  const db = await getDatabase();
  const desiredNames = dedupeTagNames(names);

  await db.withTransactionAsync(async () => {
    const desiredTagIds: string[] = [];
    for (const name of desiredNames) {
      const tag = await upsertTagByNameWithDb(db, name);
      if (tag) {
        desiredTagIds.push(tag.id);
      }
    }

    const currentRows = await db.getAllAsync<{ tag_id: string }>(
      `SELECT tag_id FROM entry_tags
        WHERE entry_type = ? AND entry_id = ? AND deleted_at IS NULL`,
      [entryType, entryId],
    );
    const { toAdd, toRemove } = diffEntryTagIds(
      currentRows.map((row) => row.tag_id),
      desiredTagIds,
    );

    for (const tagId of toRemove) {
      await db.runAsync(
        `DELETE FROM entry_tags
          WHERE entry_type = ? AND entry_id = ? AND tag_id = ?`,
        [entryType, entryId, tagId],
      );
    }

    const nowIso = new Date().toISOString();
    for (const tagId of toAdd) {
      await db.runAsync(
        `INSERT OR IGNORE INTO entry_tags (
          id, tag_id, entry_type, entry_id, created_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, NULL)`,
        [Crypto.randomUUID(), tagId, entryType, entryId, nowIso],
      );
    }
  });
}

/** A raw entry_tags link, used for full-fidelity export. */
export type EntryTagLinkExport = {
  id: string;
  tagId: string;
  entryType: TaggableEntryType;
  entryId: string;
  createdAt: string;
};

/** All active tag links, for inclusion in the local data export. */
export async function listEntryTagsForExport(): Promise<EntryTagLinkExport[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    tag_id: string;
    entry_type: string;
    entry_id: string;
    created_at: string;
  }>(
    `SELECT id, tag_id, entry_type, entry_id, created_at FROM entry_tags
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    tagId: row.tag_id,
    entryType: row.entry_type as TaggableEntryType,
    entryId: row.entry_id,
    createdAt: row.created_at,
  }));
}

/** Removes all tag links for an entry (used when an entry is hard-deleted). */
export async function clearEntryTags(
  entryType: TaggableEntryType,
  entryId: string,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM entry_tags WHERE entry_type = ? AND entry_id = ?`,
    [entryType, entryId],
  );
}
