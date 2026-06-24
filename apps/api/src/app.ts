import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { HealthResponse } from "@graceward/shared";
import { registerAnalyzeReflectionRoute } from "./routes/analyze-reflection.js";

export type BuildAppOptions = {
  /** Fastify logger config. Defaults to enabled; tests pass `false`. */
  logger?: FastifyServerOptions["logger"];
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

  app.get("/health", async (): Promise<HealthResponse> => {
    return {
      status: "ok",
      service: "api",
    };
  });

  registerAnalyzeReflectionRoute(app);

  return app;
}
