import { neon } from "@neondatabase/serverless";
import type {
  ContributionRow,
  LanguageRow,
  PagesRow,
  ProfileRow,
  ReleaseRow,
  RepoRow,
} from "./types";

type NeonSql = ReturnType<typeof neon>;

let sqlInstance: NeonSql | null = null;

/**
 * Lazily-created Neon HTTP client. Safe to import at build time without
 * DATABASE_URL — the URL is only required when a query actually runs.
 */
export const sql: NeonSql = new Proxy((() => {}) as unknown as NeonSql, {
  get(_target, prop) {
    if (!sqlInstance) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error("DATABASE_URL is not set — configure it in .env.local or the environment.");
      }
      sqlInstance = neon(url);
    }
    const value = (sqlInstance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(sqlInstance, args);
    }
    return value;
  },
  apply(_target, _thisArg, args: [TemplateStringsArray, ...unknown[]]) {
    if (!sqlInstance) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error("DATABASE_URL is not set — configure it in .env.local or the environment.");
      }
      sqlInstance = neon(url);
    }
    return (sqlInstance as unknown as (...a: unknown[]) => unknown)(...args);
  },
}) as NeonSql;

export async function upsertProfile(p: ProfileRow): Promise<void> {
  await sql`
    insert into profiles (github_id, login, name, avatar_url, bio, company, location,
      followers, following, public_repos, total_private_repos, synced_at)
    values (${p.github_id}, ${p.login}, ${p.name}, ${p.avatar_url}, ${p.bio},
      ${p.company}, ${p.location}, ${p.followers}, ${p.following},
      ${p.public_repos}, ${p.total_private_repos}, now())
    on conflict (github_id) do update set
      login = excluded.login, name = excluded.name, avatar_url = excluded.avatar_url,
      bio = excluded.bio, company = excluded.company, location = excluded.location,
      followers = excluded.followers, following = excluded.following,
      public_repos = excluded.public_repos,
      total_private_repos = excluded.total_private_repos,
      synced_at = now()`;
}

export async function upsertRepo(r: RepoRow): Promise<void> {
  await sql`
    insert into repos (github_id, name, full_name, description, private, fork, archived,
      is_template, stars, forks, open_issues, watchers, language, topics, license,
      homepage, default_branch, created_at, updated_at, pushed_at, size_kb, has_pages, synced_at)
    values (${r.github_id}, ${r.name}, ${r.full_name}, ${r.description}, ${r.private},
      ${r.fork}, ${r.archived}, ${r.is_template}, ${r.stars}, ${r.forks}, ${r.open_issues},
      ${r.watchers}, ${r.language}, ${r.topics}, ${r.license}, ${r.homepage},
      ${r.default_branch}, ${r.created_at}, ${r.updated_at}, ${r.pushed_at}, ${r.size_kb},
      ${r.has_pages}, now())
    on conflict (github_id) do update set
      name = excluded.name, full_name = excluded.full_name,
      description = excluded.description, private = excluded.private, fork = excluded.fork,
      archived = excluded.archived, is_template = excluded.is_template,
      stars = excluded.stars, forks = excluded.forks, open_issues = excluded.open_issues,
      watchers = excluded.watchers, language = excluded.language, topics = excluded.topics,
      license = excluded.license, homepage = excluded.homepage,
      default_branch = excluded.default_branch, created_at = excluded.created_at,
      updated_at = excluded.updated_at, pushed_at = excluded.pushed_at,
      size_kb = excluded.size_kb, has_pages = excluded.has_pages, synced_at = now()`;
}

export async function upsertRepos(rows: RepoRow[]): Promise<void> {
  if (rows.length === 0) return;
  // One multi-row upsert per page via a dynamic VALUES list (topics is a
  // text[] per repo, which unnest cannot expand — hence placeholders here).
  const cols = [
    "github_id", "name", "full_name", "description", "private", "fork",
    "archived", "is_template", "stars", "forks", "open_issues", "watchers",
    "language", "topics", "license", "homepage", "default_branch",
    "created_at", "updated_at", "pushed_at", "size_kb", "has_pages",
  ];
  const updatable = cols.slice(1);
  const params: unknown[] = [];
  const tuples: string[] = [];
  rows.forEach((r, i) => {
    const vals: unknown[] = [
      r.github_id, r.name, r.full_name, r.description, r.private, r.fork,
      r.archived, r.is_template, r.stars, r.forks, r.open_issues, r.watchers,
      r.language, r.topics, r.license, r.homepage, r.default_branch,
      r.created_at, r.updated_at, r.pushed_at, r.size_kb, r.has_pages,
    ];
    const base = i * vals.length;
    tuples.push(`(${vals.map((_, j) => `$${base + j + 1}`).join(", ")}, now())`);
    params.push(...vals);
  });
  const set = updatable.map((c) => `${c} = excluded.${c}`).join(", ");
  await sql.query(
    `insert into repos (${cols.join(", ")}, synced_at) values ${tuples.join(", ")} ` +
      `on conflict (github_id) do update set ${set}, synced_at = now()`,
    params as never[]
  );
}

export async function upsertLanguages(repoId: number, langs: LanguageRow[]): Promise<void> {
  if (langs.length === 0) return;
  // Replace the repo's language rows wholesale — delete + multi-row insert
  // via unnest arrays in a single round trip.
  await sql`
    with del as (delete from repo_languages where repo_id = ${repoId})
    insert into repo_languages (repo_id, language, bytes, pct)
    select ${repoId}, * from unnest(
      ${langs.map((l) => l.language)}::text[],
      ${langs.map((l) => l.bytes)}::bigint[],
      ${langs.map((l) => l.pct)}::numeric[]
    )
    on conflict (repo_id, language) do update set
      bytes = excluded.bytes, pct = excluded.pct`;
}

export async function upsertLanguagesBatch(entries: { repoId: number; langs: LanguageRow[] }[]): Promise<void> {
  const repoIds = entries.map((e) => e.repoId);
  if (repoIds.length === 0) return;
  await sql`delete from repo_languages where repo_id = any (${repoIds}::bigint[])`;
  const ids: number[] = [];
  const names: string[] = [];
  const bytes: number[] = [];
  const pcts: number[] = [];
  for (const e of entries) {
    for (const l of e.langs) {
      ids.push(e.repoId);
      names.push(l.language);
      bytes.push(l.bytes);
      pcts.push(l.pct);
    }
  }
  if (ids.length === 0) return;
  await sql`
    insert into repo_languages (repo_id, language, bytes, pct)
    select * from unnest(
      ${ids}::bigint[], ${names}::text[], ${bytes}::bigint[], ${pcts}::numeric[]
    )
    on conflict (repo_id, language) do update set
      bytes = excluded.bytes, pct = excluded.pct`;
}

export async function upsertReleases(rows: ReleaseRow[]): Promise<void> {
  if (rows.length === 0) return;
  // One multi-row upsert per page; relies on the UNIQUE(repo_id, tag_name)
  // constraint from migration 002 (FIX 02).
  await sql`
    insert into repo_releases (repo_id, tag_name, name, published_at, is_prerelease, html_url)
    select * from unnest(
      ${rows.map((r) => r.repo_id)}::bigint[],
      ${rows.map((r) => r.tag_name)}::text[],
      ${rows.map((r) => r.name)}::text[],
      ${rows.map((r) => r.published_at)}::timestamptz[],
      ${rows.map((r) => r.is_prerelease)}::boolean[],
      ${rows.map((r) => r.html_url)}::text[]
    )
    on conflict (repo_id, tag_name) do update set
      name = excluded.name, published_at = excluded.published_at,
      is_prerelease = excluded.is_prerelease, html_url = excluded.html_url`;
}

export async function upsertPagesBatch(rows: PagesRow[]): Promise<void> {
  if (rows.length === 0) return;
  await sql`
    insert into pages (repo_id, html_url, status, custom_domain)
    select * from unnest(
      ${rows.map((r) => r.repo_id)}::bigint[],
      ${rows.map((r) => r.html_url)}::text[],
      ${rows.map((r) => r.status)}::text[],
      ${rows.map((r) => r.custom_domain)}::text[]
    )
    on conflict (repo_id) do update set
      html_url = excluded.html_url, status = excluded.status,
      custom_domain = excluded.custom_domain`;
}

export async function upsertContributions(login: string, rows: ContributionRow[]): Promise<void> {
  if (rows.length === 0) return;
  // One multi-row upsert for all rows via unnest arrays.
  await sql`
    insert into contributions (login, date, count)
    select * from unnest(
      ${rows.map(() => login)}::text[],
      ${rows.map((c) => c.date)}::date[],
      ${rows.map((c) => c.count)}::int[]
    )
    on conflict (login, date) do update set count = excluded.count`;
}

export async function getSyncState(key: string): Promise<string | null> {
  const rows = (await sql`select value from sync_state where key = ${key}`) as {
    value: string | null;
  }[];
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSyncState(key: string, value: string): Promise<void> {
  await sql`
    insert into sync_state (key, value, updated_at)
    values (${key}, ${value}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}
