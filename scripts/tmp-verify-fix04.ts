/* Temp verification for FIX 04 batch SQL. Deletes every test row it creates. */
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
const db = await import("../lib/db.js");
const { sql } = db;

let failures = 0;
function check(name: string, cond: boolean, extra = ""): void {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) failures++;
}

const TAG = "__fix04_test__";
const TEST_LOGIN = "__fix04_login__";

const repos = (await sql`select * from repos order by github_id limit 1`) as Record<string, unknown>[];
if (repos.length === 0) throw new Error("repos table empty — cannot test");
const repoId = repos[0].github_id as number;

const origLangs = (await sql`select language, bytes, pct from repo_languages where repo_id = ${repoId}`) as { language: string; bytes: number; pct: number }[];
const origPages = (await sql`select repo_id, html_url, status, custom_domain from pages where repo_id = ${repoId}`) as { repo_id: number; html_url: string | null; status: string | null; custom_domain: string | null }[];

try {
  // 1. upsertLanguagesBatch
  await db.upsertLanguagesBatch([{ repoId, langs: [{ language: "__T1", bytes: 10, pct: 50 }, { language: "__T2", bytes: 10, pct: 50 }] }]);
  let rows = (await sql`select count(*)::int as c from repo_languages where repo_id = ${repoId}`) as { c: number }[];
  check("upsertLanguagesBatch inserts", rows[0].c === 2, `count=${rows[0].c}`);

  // 2. upsertLanguages (single-repo CTE version)
  await db.upsertLanguages(repoId, [{ language: "__S1", bytes: 5, pct: 100 }]);
  rows = (await sql`select language from repo_languages where repo_id = ${repoId}`) as { language: string }[];
  check("upsertLanguages replaces wholesale", rows.length === 1 && rows[0].language === "__S1", JSON.stringify(rows));

  // 3. restore original languages
  await db.upsertLanguagesBatch([{ repoId, langs: origLangs }]);
  rows = (await sql`select count(*)::int as c from repo_languages where repo_id = ${repoId}`) as { c: number }[];
  check("languages restored", rows[0].c === origLangs.length, `count=${rows[0].c} expect=${origLangs.length}`);

  // 4. upsertReleases idempotent
  await db.upsertReleases([{ repo_id: repoId, tag_name: TAG, name: "v1", published_at: "2026-01-01T00:00:00Z", is_prerelease: false, html_url: "https://example.com/1" }]);
  await db.upsertReleases([{ repo_id: repoId, tag_name: TAG, name: "v2", published_at: "2026-02-02T00:00:00Z", is_prerelease: true, html_url: "https://example.com/2" }]);
  const rel = (await sql`select count(*)::int as c from repo_releases where repo_id = ${repoId} and tag_name = ${TAG}`) as { c: number }[];
  const relRow = (await sql`select name from repo_releases where repo_id = ${repoId} and tag_name = ${TAG}`) as { name: string }[];
  check("upsertReleases idempotent+updates", rel[0].c === 1 && relRow[0]?.name === "v2", `count=${rel[0].c} name=${relRow[0]?.name}`);

  // 5. upsertContributions batched
  const days = ["2026-01-01", "2026-01-02", "2026-01-03"].map((d, i) => ({ login: TEST_LOGIN, date: d, count: i + 1 }));
  await db.upsertContributions(TEST_LOGIN, days);
  await db.upsertContributions(TEST_LOGIN, days.map((d) => ({ ...d, count: d.count + 10 })));
  const contrib = (await sql`select count(*)::int as c, coalesce(sum(count),0)::int as s from contributions where login = ${TEST_LOGIN}`) as { c: number; s: number }[];
  check("upsertContributions batched+updates", contrib[0].c === 3 && contrib[0].s === 36, `count=${contrib[0].c} sum=${contrib[0].s} expect=3/36`);

  // 6. upsertPagesBatch (save/restore if a real row exists)
  await db.upsertPagesBatch([{ repo_id: repoId, html_url: "https://example.com", status: "built", custom_domain: null }]);
  await db.upsertPagesBatch([{ repo_id: repoId, html_url: "https://example.com/2", status: "building", custom_domain: "x.example.com" }]);
  const pg = (await sql`select html_url, status from pages where repo_id = ${repoId}`) as { html_url: string | null; status: string | null }[];
  check("upsertPagesBatch idempotent+updates", pg.length === 1 && pg[0].status === "building", JSON.stringify(pg));

  // 7. upsertRepos round-trips a real row unchanged (exercises dynamic VALUES incl. topics[])
  const before = (await sql`select count(*)::int as c from repos`) as { c: number }[];
  const r = repos[0];
  await db.upsertRepos([{
    github_id: r.github_id, name: r.name, full_name: r.full_name, description: r.description,
    private: r.private, fork: r.fork, archived: r.archived, is_template: r.is_template,
    stars: r.stars, forks: r.forks, open_issues: r.open_issues, watchers: r.watchers,
    language: r.language, topics: r.topics, license: r.license, homepage: r.homepage,
    default_branch: r.default_branch, created_at: r.created_at, updated_at: r.updated_at,
    pushed_at: r.pushed_at, size_kb: r.size_kb, has_pages: r.has_pages, synced_at: null,
  }]);
  const after = (await sql`select count(*)::int as c from repos`) as { c: number }[];
  check("upsertRepos no-op on identical row", before[0].c === after[0].c, `count=${after[0].c}`);
} finally {
  await sql`delete from repo_releases where repo_id = ${repoId} and tag_name = ${TAG}`;
  await sql`delete from contributions where login = ${TEST_LOGIN}`;
  if (origPages.length > 0) {
    await db.upsertPagesBatch(origPages);
  } else {
    await sql`delete from pages where repo_id = ${repoId}`;
  }
  const leftover = (await sql`select (select count(*) from repo_releases where tag_name = ${TAG}) + (select count(*) from contributions where login = ${TEST_LOGIN}) as c`) as { c: string }[];
  check("cleanup complete", leftover[0].c === "0", `leftover=${leftover[0].c}`);
}

if (failures > 0) { throw new Error(`${failures} FAILURE(S)`); }
console.log("ALL BATCH SQL CHECKS PASSED");
}

main().catch((e) => { console.error("FAIL:", e instanceof Error ? e.message : e); process.exit(1); });
