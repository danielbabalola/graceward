import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * One install's AI usage for a single UTC day. Counts reset by replacing the
 * record with a fresh one whose `day` is the new UTC date (see quota.ts).
 */
export type InstallUsage = {
  /** UTC calendar day, YYYY-MM-DD, the counts below belong to. */
  day: string;
  analyze: number;
  transcribe: number;
  structure: number;
};

/**
 * Minimal persistence boundary for per-install quota counts. Kept deliberately
 * tiny (get/set an InstallUsage by install ID) so the file-backed beta store
 * can be swapped for Redis/Postgres later without touching the quota logic or
 * routes. Implementations must never store request content — only counts.
 */
export interface QuotaStore {
  get(installId: string): InstallUsage | undefined;
  set(installId: string, usage: InstallUsage): void;
}

/** In-memory store. Used by tests and as the side-effect-free buildApp default. */
export function createInMemoryQuotaStore(): QuotaStore {
  const installs = new Map<string, InstallUsage>();
  return {
    get(installId) {
      return installs.get(installId);
    },
    set(installId, usage) {
      installs.set(installId, usage);
    },
  };
}

type PersistedShape = {
  version: 1;
  installs: Record<string, InstallUsage>;
};

function isInstallUsage(value: unknown): value is InstallUsage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.day === "string" &&
    typeof v.analyze === "number" &&
    typeof v.transcribe === "number" &&
    typeof v.structure === "number"
  );
}

/**
 * File-backed JSON quota store for closed beta. Keeps the full map in memory
 * (authoritative) and persists it to a single JSON file on each write using a
 * temp-file + rename for atomicity. Intentionally simple: single API instance,
 * no external infra. Persistence is best-effort — a failed write never breaks a
 * request (the in-memory map stays correct for the process lifetime). Stores
 * only opaque install IDs and integer counts, never any request content.
 */
export function createFileQuotaStore(filePath: string): QuotaStore {
  const installs = new Map<string, InstallUsage>();

  // Best-effort load of any existing state. A missing or corrupt file simply
  // starts from empty rather than crashing the server on boot.
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (parsed && typeof parsed.installs === "object" && parsed.installs) {
      for (const [id, usage] of Object.entries(parsed.installs)) {
        if (isInstallUsage(usage)) {
          installs.set(id, usage);
        }
      }
    }
  } catch {
    // No readable prior state; begin empty.
  }

  function persist(): void {
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      const shape: PersistedShape = {
        version: 1,
        installs: Object.fromEntries(installs),
      };
      const tmp = `${filePath}.tmp`;
      writeFileSync(tmp, JSON.stringify(shape), "utf8");
      renameSync(tmp, filePath);
    } catch {
      // Persistence is best-effort; the in-memory map remains authoritative.
    }
  }

  return {
    get(installId) {
      return installs.get(installId);
    },
    set(installId, usage) {
      installs.set(installId, usage);
      persist();
    },
  };
}

/**
 * Resolves the file path for the persistent quota store from
 * AI_QUOTA_STORE_PATH, defaulting to ./.data/ai-quota.json relative to the
 * process working directory (apps/api when run via its scripts).
 */
export function resolveQuotaStorePath(): string {
  const configured = process.env.AI_QUOTA_STORE_PATH?.trim();
  return configured && configured.length > 0
    ? configured
    : "./.data/ai-quota.json";
}
