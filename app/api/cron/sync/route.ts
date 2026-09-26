import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServiceGitHubToken } from "@/lib/auth/session";
import { runSyncChunk } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = await getServiceGitHubToken();
  if (!token) {
    return NextResponse.json(
      {
        status: "auth_failed",
        done: false,
        message: "No stored GitHub token — run a manual sync once while signed in.",
      },
      { status: 200 }
    );
  }
  const report = await runSyncChunk({ token });
  return NextResponse.json(report);
}
