/* Temp helper for FIX 04 live test: inspect/reset sync_state. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* rely on environment */ }

async function main(): Promise<void> {
  const { sql } = await import("../lib/db.js");
  const mode = process.argv[2] ?? "show";
  if (mode === "set-repos") {
    await sql`insert into sync_state (key, value, updated_at) values ('sync_phase', 'repos', now())
      on conflict (key) do update set value = 'repos', updated_at = now()`;
    await sql`insert into sync_state (key, value, updated_at) values ('repos_cursor', '', now())
      on conflict (key) do update set value = '', updated_at = now()`;
    console.log("state forced: sync_phase=repos, repos_cursor=''");
    return;
  }
  const rows = (await sql`select key, left(value, 60) as value from sync_state
    where key in ('sync_phase','repos_cursor','status','last_sync') order by key`) as { key: string; value: string | null }[];
  const counts = (await sql`select (select count(*)::int from repos) as repos,
    (select count(*)::int from repo_languages) as langs,
    (select count(*)::int from repo_releases) as releases`) as { repos: number; langs: number; releases: number }[];
  console.log("sync_state:", JSON.stringify(rows));
  console.log("counts:", JSON.stringify(counts[0]));
}

main().catch((e) => { console.error("FAIL:", e instanceof Error ? e.message : e); process.exit(1); });
