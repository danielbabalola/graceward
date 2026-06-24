import { buildApp } from "./app.js";

// Load apps/api/.env (relative to the process cwd) when present. Uses Node's
// built-in loader so no dotenv dependency is needed. Real environment
// variables (e.g. in production) take precedence when no file exists.
try {
  process.loadEnvFile();
} catch {
  // No .env file found; rely on the existing process environment.
}

const app = buildApp();

// Production safety guardrail. The AI endpoint currently has no auth or
// subscription/entitlement strategy, so in production it would be an open,
// unauthenticated, paid AI endpoint protected only by IP rate limiting. Warn
// loudly on startup (never blocking, never logging secrets) so this can't ship
// silently. Remove once real auth/entitlements land.
if ((process.env.NODE_ENV ?? "").toLowerCase() === "production") {
  app.log.warn(
    {
      category: "PRODUCTION_SAFETY",
      endpoints: ["/ai/analyze-reflection", "/ai/transcribe-reflection"],
    },
    "AI endpoints have no auth or subscription enforcement yet; they are protected only by in-memory IP rate limiting. Do not treat this as production-ready access control.",
  );
}

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
