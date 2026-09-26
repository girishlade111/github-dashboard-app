import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setSyncState } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "gh_sync_state";

interface GitHubTokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
}

/** Redirect to / with a ?github=<reason> flag and clear the state cookie. */
function back(request: NextRequest, reason: string): NextResponse {
  const url = new URL("/", request.url);
  url.searchParams.set("github", reason);
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

/**
 * OAuth callback for our own GitHub App (full-access sync token).
 * Validates state, exchanges the code, verifies granted scopes from the
 * x-oauth-scopes header only, and persists under "github_sync_token".
 * Token values are never logged.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;

  const expected = request.cookies.get(STATE_COOKIE)?.value ?? "";
  const actual = params.get("state") ?? "";
  const stateOk =
    expected.length > 0 &&
    actual.length === expected.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  if (!stateOk) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }

  if (params.get("error")) return back(request, "denied");

  const code = params.get("code");
  const clientId = process.env.GITHUB_SYNC_CLIENT_ID;
  const clientSecret = process.env.GITHUB_SYNC_CLIENT_SECRET;
  const redirectUri = new URL("/api/github/callback", request.url).toString();
  if (!code || !clientId || !clientSecret) return back(request, "error");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return back(request, "error");
  const tokenBody = (await tokenRes.json()) as GitHubTokenResponse;
  const accessToken =
    typeof tokenBody.access_token === "string" && tokenBody.access_token.length > 0
      ? tokenBody.access_token
      : null;
  if (!accessToken) return back(request, "error");

  // Verify granted scopes from the response header only — the token itself
  // is never logged, persisted anywhere except sync_state, or echoed back.
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-personal-dashboard",
    },
    cache: "no-store",
  });
  if (!userRes.ok) return back(request, "error");
  const scopes = (userRes.headers.get("x-oauth-scopes") ?? "")
    .split(",")
    .map((s) => s.trim());
  if (!scopes.includes("repo") || !scopes.includes("read:packages")) {
    return back(request, "scopes");
  }

  await setSyncState("github_sync_token", accessToken);
  if (typeof tokenBody.refresh_token === "string" && tokenBody.refresh_token.length > 0) {
    await setSyncState("github_sync_refresh_token", tokenBody.refresh_token);
  }
  if (typeof tokenBody.expires_in === "number") {
    await setSyncState(
      "github_sync_token_expires_at",
      new Date(Date.now() + tokenBody.expires_in * 1000).toISOString()
    );
  }
  return back(request, "connected");
}
