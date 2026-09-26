import { neon } from "@neondatabase/serverless";
import type {
  ContributionRow,
  LanguageRow,
  ProfileRow,
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

export async function upsertLanguages(repoId: number, langs: LanguageRow[]): Promise<void> {
  if (langs.length === 0) return;
  // Replace the repo's language rows wholesale — one call per repo.
  await sql`delete from repo_languages where repo_id = ${repoId}`;
  for (const l of langs) {
    await sql`
      insert into repo_languages (repo_id, language, bytes, pct)
      values (${repoId}, ${l.language}, ${l.bytes}, ${l.pct})
      on conflict (repo_id, language) do update set
        bytes = excluded.bytes, pct = excluded.pct`;
  }
}

export async function upsertContributions(login: string, rows: ContributionRow[]): Promise<void> {
  for (const c of rows) {
    await sql`
      insert into contributions (login, date, count)
      values (${login}, ${c.date}, ${c.count})
      on conflict (login, date) do update set count = excluded.count`;
  }
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
