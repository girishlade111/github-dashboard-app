import "server-only";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { auth } from "./server";
import { isAllowed } from "./allowlist";
import { getSyncState } from "../db";

/**
 * SERVER-ONLY helpers. Never import this file (or getGitHubToken) from a
 * client component — the GitHub token must never reach the browser.
 */

export interface SessionUser {
  login: string;
  name: string | null;
  avatar: string | null;
}

/**
 * Reads the GitHub OAuth access token for the current session via Neon's
 * dedicated `get-access-token` endpoint (it also refreshes the token when
 * needed). `listAccounts()` does NOT return the raw token, so it cannot be
 * used here. Returns null when missing/expired (caller shows reconnect banner).
 */
export async function getGitHubToken(): Promise<string | null> {
  /* Neon Auth SDK declares get-access-token as GET (404s upstream) and
     listAccounts() strips tokens by design, so we call better-auth's native
     POST /get-access-token directly, server-side only. */
  try {
    const h = await headers();
    const c = await cookies();
    const origin = h.get("origin") ?? `http://${h.get("host") ?? "localhost:3000"}`;
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    if (!baseUrl) return null;
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/get-access-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: c.toString(),
        Origin: origin,
      },
      body: JSON.stringify({ providerId: "github" }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken?: unknown };
    const token = data?.accessToken;
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/* Short-lived in-memory cache: token -> GitHub login (5 min). */
const loginCache = new Map<string, { login: string; expires: number }>();

async function getGitHubLogin(token: string): Promise<string | null> {
  const cached = loginCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.login;

  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-personal-dashboard",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { login?: string };
  if (!body.login) return null;
  loginCache.set(token, { login: body.login, expires: Date.now() + 5 * 60 * 1000 });
  return body.login;
}

/**
 * Guards a protected page/route: requires a session, a usable GitHub token,
 * and an allowlisted GitHub login. Redirects to /login or /denied otherwise.
 */
export async function requireUser(): Promise<SessionUser> {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/login");

  const token = await getGitHubToken();
  if (!token) redirect("/login"); // token revoked/expired → sign in again

  const login = await getGitHubLogin(token);
  if (!isAllowed(login)) redirect("/denied");

  return {
    login: login as string,
    name: session.user.name ?? null,
    avatar: session.user.image ?? null,
  };
}

/**
 * Session-less token lookup for the cron job. The token is cached in
 * `sync_state` by runSyncChunk whenever an interactive (signed-in) sync runs,
 * so the daily cron can sync without a browser session. Server-side only.
 */
export async function getServiceGitHubToken(): Promise<string | null> {
  return getSyncState("github_token");
}
