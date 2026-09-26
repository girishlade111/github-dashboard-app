import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getSyncState, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  await requireUser(); // throws/redirects unless allowlisted
  const [lastSync, status] = await Promise.all([
    getSyncState("last_sync"),
    getSyncState("status"),
  ]);
  const rows = (await sql`select count(*)::int as count from repos`) as { count: number }[];
  return NextResponse.json({
    last_sync: lastSync,
    status: status ?? "never",
    repos_synced: rows[0]?.count ?? 0,
  });
}
