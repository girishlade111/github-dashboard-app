import "server-only";

import {
  getSyncState,
  setSyncState,
  sql,
  upsertContributions,
  upsertLanguages,
  upsertProfile,
  upsertRepo,
} from "./db";
import {
  GitHubAuthError,
  GitHubRateError,
  getPackages,
  getPagesInfo,
  getProfileAndContributions,
  listReposPage,
  toRepoRow,
  type GitHubPackage,
  type PackageType,
} from "./github";
import type { ProfileRow } from "./types";

export interface SyncReport {
  phase: string;
  reposUpserted: number;
  done: boolean;
  status: "ok" | "in_progress" | "auth_failed" | "rate_limited" | "error";
  message?: string;
}

const PACKAGE_TYPES: PackageType[] = ["npm", "container", "maven", "rubygems", "nuget"];
const PAGES_BATCH = 50;
const PACKAGE_PAGES_PER_CHUNK = 2;

interface RepoIdRow {
  github_id: number;
  full_name: string;
}

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

async function upsertPackageRecord(p: GitHubPackage): Promise<void> {
  let repoId: number | null = null;
  if (p.repository_full_name) {
    const rows = (await sql`select github_id from repos where full_name = ${p.repository_full_name} limit 1`) as {
      github_id: number;
    }[];
    repoId = rows.length > 0 ? rows[0].github_id : null;
  }
  await sql`
    insert into packages (repo_id, name, package_type, visibility, version, html_url)
    values (${repoId}, ${p.name}, ${p.package_type}, ${p.visibility}, ${p.version}, ${p.html_url})
    on conflict (package_type, name) do update set
      repo_id = excluded.repo_id, visibility = excluded.visibility,
      version = excluded.version, html_url = excluded.html_url`;
}

async function syncPackagesPhase(token: string): Promise<{ finished: boolean; count: number }> {
  let count = 0;
  for (const type of PACKAGE_TYPES) {
    const doneKey = `pkg_${type}_done`;
    if ((await getSyncState(doneKey)) === "1") continue;
    let page = Number((await getSyncState(`pkg_${type}_page`)) ?? "1");
    if (!Number.isFinite(page) || page < 1) page = 1;
    let pagesThisChunk = 0;
    for (;;) {
      const pkgs = await getPackages(token, type, page);
      if (pkgs.length === 0) {
        await setSyncState(doneKey, "1");
        await setSyncState(`pkg_${type}_page`, "1");
        break;
      }
      for (const p of pkgs) {
        await upsertPackageRecord(p);
        count++;
      }
      page++;
      await setSyncState(`pkg_${type}_page`, String(page));
      pagesThisChunk++;
      if (pagesThisChunk >= PACKAGE_PAGES_PER_CHUNK) {
        return { finished: false, count }; // resume next chunk
      }
    }
  }
  return { finished: true, count };
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

async function syncPagesPhase(token: string): Promise<{ finished: boolean; count: number }> {
  const rows = (await sql`
    select r.github_id, r.full_name from repos r
    where r.has_pages = true
      and not exists (select 1 from pages p where p.repo_id = r.github_id)
    order by r.pushed_at desc nulls last
    limit ${PAGES_BATCH}
  `) as RepoIdRow[];
  let count = 0;
  for (const row of rows) {
    const [owner, ...rest] = row.full_name.split("/");
    const repo = rest.join("/");
    const info = await getPagesInfo(token, owner, repo);
    await sql`
      insert into pages (repo_id, html_url, status, custom_domain)
      values (${row.github_id}, ${info?.html_url ?? null}, ${info?.status ?? null}, ${info?.cname ?? null})
      on conflict (repo_id) do update set
        html_url = excluded.html_url, status = excluded.status,
        custom_domain = excluded.custom_domain`;
    count++;
  }
  return { finished: rows.length < PAGES_BATCH, count };
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

async function syncProfilePhase(token: string): Promise<void> {
  const { profile, contributions } = await getProfileAndContributions(token);
  const counts = (await sql`
    select
      count(*) filter (where private = false)::int as public_count,
      count(*) filter (where private = true)::int as private_count,
      coalesce(sum(stars), 0)::int as total_stars,
      count(*)::int as total_repos
    from repos
  `) as { public_count: number; private_count: number; total_stars: number; total_repos: number }[];
  const c = counts[0] ?? { public_count: 0, private_count: 0, total_stars: 0, total_repos: 0 };

  const prow: ProfileRow = {
    github_id: profile.databaseId,
    login: profile.login,
    name: profile.name,
    avatar_url: profile.avatarUrl,
    bio: profile.bio,
    company: profile.company,
    location: profile.location,
    followers: profile.followers,
    following: profile.following,
    public_repos: c.public_count,
    total_private_repos: c.private_count,
    synced_at: null,
  };
  await upsertProfile(prow);
  await upsertContributions(
    profile.login,
    contributions.map((d) => ({ login: profile.login, date: d.date, count: d.count }))
  );

  const today = new Date().toISOString().slice(0, 10);
  await sql`
    insert into user_snapshots (login, date, followers, following, total_stars, total_repos)
    values (${profile.login}, ${today}, ${profile.followers}, ${profile.following}, ${c.total_stars}, ${c.total_repos})
    on conflict (login, date) do update set
      followers = excluded.followers, following = excluded.following,
      total_stars = excluded.total_stars, total_repos = excluded.total_repos`;
}

/* ------------------------------------------------------------------ */
/* Chunk runner                                                        */
/* ------------------------------------------------------------------ */

export async function runSyncChunk(opts: { token: string; maxPages?: number }): Promise<SyncReport> {
  const { token, maxPages = 4 } = opts;
  let reposUpserted = 0;

  // Cache the token for the session-less cron (server-side DB only, never logged).
  try {
    if ((await getSyncState("github_token")) !== token) {
      await setSyncState("github_token", token);
    }
  } catch {
    // non-fatal; cron will simply report that a manual sync is needed
  }

  const fail = async (status: SyncReport["status"], message?: string, phase = ""): Promise<SyncReport> => {
    await setSyncState("status", status);
    return { phase, reposUpserted, done: false, status, message };
  };

  try {
    const phase = (await getSyncState("sync_phase")) ?? "repos";

    /* ---- repos ---- */
    if (phase === "repos") {
      let cursor = await getSyncState("repos_cursor");
      let pagesDone = 0;
      for (;;) {
        const page = await listReposPage(token, cursor);
        for (const g of page.repos) {
          const row = toRepoRow(g);
          await upsertRepo(row);
          await upsertLanguages(row.github_id, g.languages.map((l) => ({ language: l.name, bytes: l.size, pct: l.pct })));
          if (g.latestRelease?.tagName) {
            const rel = g.latestRelease;
            await sql`
              insert into repo_releases (repo_id, tag_name, name, published_at, is_prerelease, html_url)
              values (${row.github_id}, ${rel.tagName}, ${rel.name}, ${rel.publishedAt}, ${rel.isPrerelease}, ${rel.url})
              on conflict do nothing`;
          }
          reposUpserted++;
        }
        cursor = page.pageInfo.endCursor;
        await setSyncState("repos_cursor", cursor ?? "");
        pagesDone++;
        if (!page.pageInfo.hasNextPage) break;
        if (pagesDone >= maxPages) {
          await setSyncState("status", "in_progress");
          return { phase: "repos", reposUpserted, done: false, status: "in_progress" };
        }
      }
      await setSyncState("sync_phase", "packages");
    }

    /* ---- packages ---- */
    if ((await getSyncState("sync_phase")) === "packages") {
      const { finished, count } = await syncPackagesPhase(token);
      reposUpserted += count;
      if (!finished) {
        await setSyncState("status", "in_progress");
        return { phase: "packages", reposUpserted, done: false, status: "in_progress" };
      }
      await setSyncState("sync_phase", "pages");
    }

    /* ---- pages ---- */
    if ((await getSyncState("sync_phase")) === "pages") {
      const { finished, count } = await syncPagesPhase(token);
      reposUpserted += count;
      if (!finished) {
        await setSyncState("status", "in_progress");
        return { phase: "pages", reposUpserted, done: false, status: "in_progress" };
      }
      await setSyncState("sync_phase", "profile");
    }

    /* ---- profile ---- */
    if ((await getSyncState("sync_phase")) === "profile") {
      await syncProfilePhase(token);
    }

    /* ---- done ---- */
    await setSyncState("last_sync", new Date().toISOString());
    await setSyncState("status", "ok");
    await setSyncState("sync_phase", "done");
    await setSyncState("repos_cursor", "");
    return { phase: "done", reposUpserted, done: true, status: "ok" };
  } catch (err) {
    if (err instanceof GitHubAuthError) {
      return fail("auth_failed", "GitHub token invalid or expired — reconnect GitHub and sync again.");
    }
    if (err instanceof GitHubRateError) {
      return fail("rate_limited", err.resetAt ? `Rate limited — resumes after ${err.resetAt.toISOString()}.` : "Rate limited.");
    }
    const message = err instanceof Error ? err.message : "Unknown sync error";
    console.error("[sync] chunk failed:", message);
    return fail("error", message);
  }
}
