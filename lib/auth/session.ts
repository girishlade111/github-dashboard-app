import "server-only";

import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { auth } from "./server";
import { isAllowed } from "./allowlist";
import { getSyncState, setSyncState } from "../db";

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
  // (a) Full-access token from our own GitHub OAuth App (private repos +
  // packages). Never logged; server-side only.
  try {
    const wide = await getWideSyncToken();
    if (wide) return wide;
  } catch {
    // DB unavailable — fall through to the session token below.
  }

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
    if (typeof token === "string" && token.length > 0) return token;
  } catch {
    // fall through to the legacy cached token below
  }

  // (c) Legacy session-less cache (narrow Neon scopes). Last resort.
  try {
    return await getSyncState("github_token");
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
 * Session-less token lookup for the cron job. Prefers the full-access token
 * from our own GitHub OAuth App, then the legacy narrow cache. Server-side only.
 */
export async function getServiceGitHubToken(): Promise<string | null> {
  try {
    const wide = await getWideSyncToken();
    if (wide) return wide;
  } catch {
    // fall through to the legacy cache below
  }
  return getSyncState("github_token");
}

/* ------------------------------------------------------------------ */
/* Full-access sync token (own GitHub OAuth App)                       */
/* ------------------------------------------------------------------ */

const WIDE_TOKEN_KEY = "github_sync_token";
const WIDE_REFRESH_KEY = "github_sync_refresh_token";
const WIDE_EXPIRY_KEY = "github_sync_token_expires_at";

interface GitHubRefreshResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
}

/** Refresh an expired wide token using the stored refresh token. Never logs tokens. */
async function refreshWideToken(refreshToken: string): Promise<boolean> {
  try {
    const clientId = process.env.GITHUB_SYNC_CLIENT_ID;
    const clientSecret = process.env.GITHUB_SYNC_CLIENT_SECRET;
    if (!clientId || !clientSecret) return false;
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as GitHubRefreshResponse;
    if (typeof body.access_token !== "string" || body.access_token.length === 0) return false;
    await setSyncState(WIDE_TOKEN_KEY, body.access_token);
    if (typeof body.refresh_token === "string" && body.refresh_token.length > 0) {
      await setSyncState(WIDE_REFRESH_KEY, body.refresh_token);
    }
    if (typeof body.expires_in === "number") {
      await setSyncState(
        WIDE_EXPIRY_KEY,
        new Date(Date.now() + body.expires_in * 1000).toISOString()
      );
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Full-access sync token when the user connected our own GitHub OAuth App.
 * Refreshes first when past the stored expiry and a refresh token exists.
 */
async function getWideSyncToken(): Promise<string | null> {
  const token = await getSyncState(WIDE_TOKEN_KEY);
  if (!token) return null;
  const expiresAt = await getSyncState(WIDE_EXPIRY_KEY);
  if (expiresAt) {
    const exp = Date.parse(expiresAt);
    if (!Number.isNaN(exp) && exp <= Date.now()) {
      const refresh = await getSyncState(WIDE_REFRESH_KEY);
      if (refresh && (await refreshWideToken(refresh))) {
        return getSyncState(WIDE_TOKEN_KEY);
      }
      return null; // expired with no usable refresh — try other sources
    }
  }
  return token;
}
