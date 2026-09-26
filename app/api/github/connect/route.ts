import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "gh_sync_state";
const CONNECT_SCOPES = "read:user user:email repo read:packages";

/**
 * Starts the full-access GitHub OAuth flow (our own OAuth App, used for
 * syncing private repos + packages). Neon Auth stays login-only.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GITHUB_SYNC_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub sync app not configured" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const state = randomBytes(32).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/github/callback`,
    scope: CONNECT_SCOPES,
    state,
  });

  const res = NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
