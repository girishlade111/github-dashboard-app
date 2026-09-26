import RepoGrid from "@/components/RepoGrid";
import type { RepoCardData } from "@/components/RepoCard";
import { requireUser } from "@/lib/auth/session";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RepoDbRow {
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  is_template: boolean;
  stars: number;
  forks: number;
  open_issues: number;
  language: string | null;
  topics: string[];
  license: string | null;
  homepage: string | null;
  pushed_at: string | null;
}

interface LanguageDbRow {
  repo_id: number;
  language: string;
  pct: number;
}

interface ReleaseDbRow {
  repo_id: number;
  tag_name: string | null;
  html_url: string | null;
}

interface PackageDbRow {
  repo_id: number;
  package_type: string;
  name: string;
  version: string | null;
}

interface PageDbRow {
  repo_id: number;
  html_url: string | null;
  status: string | null;
}

export default async function RepositoriesPage() {
  await requireUser();

  const [repoRaw, langRaw, relRaw, pkgRaw, pageRaw] = await Promise.all([
    sql`select github_id, name, full_name, description, private, fork, archived,
      is_template, stars, forks, open_issues, language, topics, license, homepage, pushed_at
      from repos order by pushed_at desc nulls last`,
    sql`select repo_id, language, pct from repo_languages order by pct desc`,
    sql`select distinct on (repo_id) repo_id, tag_name, html_url from repo_releases
      order by repo_id, published_at desc nulls last`,
    sql`select repo_id, package_type, name, version from packages order by repo_id, name`,
    sql`select repo_id, html_url, status from pages`,
  ]);

  const repoRows = repoRaw as RepoDbRow[];
  const languages = new Map<number, { language: string; pct: number }[]>();
  for (const l of langRaw as LanguageDbRow[]) {
    const list = languages.get(l.repo_id) ?? [];
    list.push({ language: l.language, pct: l.pct });
    languages.set(l.repo_id, list);
  }
  const releases = new Map<number, { tag_name: string | null; html_url: string | null }>();
  for (const r of relRaw as ReleaseDbRow[]) releases.set(r.repo_id, { tag_name: r.tag_name, html_url: r.html_url });
  const packages = new Map<number, { package_type: string; name: string; version: string | null }[]>();
  for (const p of pkgRaw as PackageDbRow[]) {
    const list = packages.get(p.repo_id) ?? [];
    list.push({ package_type: p.package_type, name: p.name, version: p.version });
    packages.set(p.repo_id, list);
  }
  const pages = new Map<number, { html_url: string | null; status: string | null }>();
  for (const p of pageRaw as PageDbRow[]) pages.set(p.repo_id, { html_url: p.html_url, status: p.status });

  const repos: RepoCardData[] = repoRows.map((r) => ({
    github_id: r.github_id,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    private: r.private,
    fork: r.fork,
    archived: r.archived,
    is_template: r.is_template,
    stars: r.stars,
    forks: r.forks,
    open_issues: r.open_issues,
    language: r.language,
    languages: languages.get(r.github_id) ?? [],
    topics: r.topics ?? [],
    license: r.license,
    homepage: r.homepage,
    pushed_at: r.pushed_at,
    latest_release: releases.get(r.github_id) ?? null,
    packages: packages.get(r.github_id) ?? [],
    pages: pages.get(r.github_id) ?? null,
    repo_url: `https://github.com/${r.full_name}`,
  }));

  return (
    <div className="pb-16">
      <header className="pt-12">
        <h1 className="font-display text-6xl font-normal tracking-[-0.02em] text-ink">
          Repositories
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          Every repository, cached from GitHub and searchable in one place.
        </p>
      </header>
      <div className="mt-8">
        <RepoGrid repos={repos} />
      </div>
    </div>
  );
}
