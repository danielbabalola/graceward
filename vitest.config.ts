import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Single root Vitest config covering the non-UI packages we want to protect.
 * Each project is a plain Node environment — there is intentionally no React
 * Native / jsdom / Expo setup here (no component or SQLite integration tests
 * yet). The mobile project only resolves the "@/" path alias so a handful of
 * pure helper modules can be unit-tested without pulling in Expo.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "ai-schemas",
          root: "./packages/ai-schemas",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "shared",
          root: "./packages/shared",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "api",
          root: "./apps/api",
          environment: "node",
          include: ["test/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./apps/mobile", import.meta.url)),
          },
        },
        test: {
          name: "mobile-helpers",
          root: "./apps/mobile",
          environment: "node",
          // Only pure, Expo-free helper modules are tested here.
          include: ["test/**/*.test.ts"],
        },
      },
    ],
  },
});
