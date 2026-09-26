import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuth = ReturnType<typeof createNeonAuth>;

let instance: NeonAuth | null = null;

function getInstance(): NeonAuth {
  if (!instance) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL is not set — configure it in .env.local or the environment.");
    if (!secret) throw new Error("NEON_AUTH_COOKIE_SECRET is not set — configure it in .env.local or the environment.");
    instance = createNeonAuth({ baseUrl, cookies: { secret } });
  }
  return instance;
}

/**
 * Lazily-created Neon Auth server client. Safe to import at build time or in
 * Edge middleware without env vars present — they are only required when a
 * method is actually invoked at request time.
 */
export const auth: NeonAuth = new Proxy({} as NeonAuth, {
  get(_target, prop) {
    const value = (getInstance() as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(getInstance(), args);
    }
    return value;
  },
});
