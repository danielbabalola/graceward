/**
 * Base URL of the Graceward API. Configured via the EXPO_PUBLIC_API_URL env
 * var (see .env.example for iOS simulator vs physical device notes). Falls
 * back to localhost, which works for the iOS simulator.
 */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
