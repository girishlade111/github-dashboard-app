import { NextResponse } from "next/server";
import { getGitHubToken, requireUser } from "@/lib/auth/session";
import { runSyncChunk } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(): Promise<NextResponse> {
  await requireUser(); // throws/redirects unless allowlisted
  const token = await getGitHubToken();
  if (!token) {
    return NextResponse.json(
      { status: "auth_failed", done: false, message: "GitHub token missing — sign in again to reconnect." },
      { status: 200 }
    );
  }
  const report = await runSyncChunk({ token });
  return NextResponse.json(report);
}
