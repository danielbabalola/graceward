import Fastify from "fastify";
import type { HealthResponse } from "@graceward/shared";
import { registerAnalyzeReflectionRoute } from "./routes/analyze-reflection.js";

// Load apps/api/.env (relative to the process cwd) when present. Uses Node's
// built-in loader so no dotenv dependency is needed. Real environment
// variables (e.g. in production) take precedence when no file exists.
try {
  process.loadEnvFile();
} catch {
  // No .env file found; rely on the existing process environment.
}

const app = Fastify({
  logger: true,
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

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
