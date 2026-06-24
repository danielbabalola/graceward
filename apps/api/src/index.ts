import { buildApp } from "./app.js";
import {
  createFileQuotaStore,
  resolveQuotaStorePath,
} from "./ai/quota-store.js";
import { aiEndpointsEnabled } from "./ai/access-guard.js";

// Load apps/api/.env (relative to the process cwd) when present. Uses Node's
// built-in loader so no dotenv dependency is needed. Real environment
// variables (e.g. in production) take precedence when no file exists.
try {
  process.loadEnvFile();
} catch {
  // No .env file found; rely on the existing process environment.
}

// Real runs persist per-install AI quotas to a JSON file so closed-beta cost
// controls survive restarts. Tests and buildApp's default use an in-memory
// store instead (see app.ts), keeping the factory side-effect-free.
const app = buildApp({
  quotaStore: createFileQuotaStore(resolveQuotaStorePath()),
});

// Production safety guardrail. The AI endpoints have closed-beta access control
// (anonymous per-install ID + per-install daily quotas + IP rate limiting) but
// NOT real user auth, accounts, or subscription/entitlement enforcement. Warn
// loudly on startup (never blocking, never logging secrets) so this can't ship
// silently as if it were production-grade access control. Keep this list in
// sync with every paid AI route in app.ts. Remove once real auth/entitlements
// land.
if ((process.env.NODE_ENV ?? "").toLowerCase() === "production") {
  const paidAiEndpoints = [
    "/ai/analyze-reflection",
    "/ai/transcribe-reflection",
    "/ai/structure-voice-entry",
  ];
  app.log.warn(
    {
      category: "PRODUCTION_SAFETY",
      endpoints: paidAiEndpoints,
      aiEndpointsEnabled: aiEndpointsEnabled(),
    },
    `All ${paidAiEndpoints.length} paid AI endpoints (${paidAiEndpoints.join(", ")}) use closed-beta protection only — anonymous per-install quotas plus in-memory IP rate limiting, with no user auth, accounts, or subscription enforcement. Do not treat this as production-ready access control.`,
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
