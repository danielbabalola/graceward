import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import multipart from "@fastify/multipart";
import { MAX_TRANSCRIPTION_FILE_BYTES } from "@graceward/ai-schemas";
import type { HealthResponse } from "@graceward/shared";
import { registerAnalyzeReflectionRoute } from "./routes/analyze-reflection.js";
import { registerTranscribeReflectionRoute } from "./routes/transcribe-reflection.js";
import { registerStructureVoiceEntryRoute } from "./routes/structure-voice-entry.js";
import { registerStructureTextEntryRoute } from "./routes/structure-text-entry.js";
import { createQuotaService, resolveQuotaConfig } from "./ai/quota.js";
import {
  createInMemoryQuotaStore,
  type QuotaStore,
} from "./ai/quota-store.js";

export type BuildAppOptions = {
  /** Fastify logger config. Defaults to enabled; tests pass `false`. */
  logger?: FastifyServerOptions["logger"];
  /**
   * Persistent quota store backing per-install AI quotas. Defaults to an
   * in-memory store so buildApp stays side-effect-free (no file I/O) — the
   * entrypoint (index.ts) injects a file-backed store for real runs, and tests
   * may inject a pre-seeded in-memory store.
   */
  quotaStore?: QuotaStore;
};

/**
 * Constructs the Fastify app with all routes registered. Pure and
 * side-effect-free beyond creating the instance: it does not load env files,
 * listen on a port, or log startup warnings — those belong to the entrypoint
 * (index.ts). This factory is what tests exercise via `app.inject()`.
 */
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
    // Keep request bodies small; the reflection text limit is enforced again by
    // schema validation. Guards against oversized uploads.
    bodyLimit: 256 * 1024,
  });

  // Multipart parsing is used only by the transcription route. The per-file
  // size limit guards against oversized uploads before any provider work; the
  // file count is capped at one (only the selected recording is uploaded).
  void app.register(multipart, {
    limits: {
      fileSize: MAX_TRANSCRIPTION_FILE_BYTES,
      files: 1,
      fields: 10,
    },
  });

  app.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      service: "api",
    };
  });

  // Per-install daily AI quota (closed-beta cost/abuse control). Shared across
  // all three AI routes so the combined total cap is honored. The store is the
  // only stateful dependency; everything else (config, clock) is derived here.
  const quotaStore = options.quotaStore ?? createInMemoryQuotaStore();
  const quota = createQuotaService(quotaStore, resolveQuotaConfig());

  registerAnalyzeReflectionRoute(app, quota);
  registerTranscribeReflectionRoute(app, quota);
  registerStructureVoiceEntryRoute(app, quota);
  registerStructureTextEntryRoute(app, quota);

  return app;
}
