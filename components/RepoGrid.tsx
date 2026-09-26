"use client";

import { useMemo, useState } from "react";
import FilterBar, { type RepoPill, type RepoSort } from "./FilterBar";
import RepoCard, { type RepoCardData } from "./RepoCard";
import { EmptyState } from "./ui";

function matchesSearch(repo: RepoCardData, q: string): boolean {
  const hay = [
    repo.name,
    repo.description ?? "",
    repo.language ?? "",
    ...repo.topics,
    ...repo.languages.map((l) => l.language),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export default function RepoGrid({ repos }: { repos: RepoCardData[] }) {
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [pill, setPill] = useState<RepoPill>("all");
  const [sort, setSort] = useState<RepoSort>("stars");

  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const r of repos) for (const l of r.languages) set.add(l.language);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [repos]);

  const counts = useMemo<Record<RepoPill, number>>(
    () => ({
      all: repos.length,
      public: repos.filter((r) => !r.private).length,
      private: repos.filter((r) => r.private).length,
      forks: repos.filter((r) => r.fork).length,
      archived: repos.filter((r) => r.archived).length,
    }),
    [repos]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = repos.filter((r) => {
      if (pill === "public" && r.private) return false;
      if (pill === "private" && !r.private) return false;
      if (pill === "forks" && !r.fork) return false;
      if (pill === "archived" && !r.archived) return false;
      if (language && !r.languages.some((l) => l.language === language)) return false;
      if (q && !matchesSearch(r, q)) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sort === "stars") sorted.sort((a, b) => b.stars - a.stars || b.forks - a.forks);
    else if (sort === "pushed")
      sorted.sort(
        (a, b) =>
          (b.pushed_at ? new Date(b.pushed_at).getTime() : 0) -
          (a.pushed_at ? new Date(a.pushed_at).getTime() : 0)
      );
    else sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [repos, search, language, pill, sort]);

  return (
    <div>
      <FilterBar
        search={search}
        onSearch={setSearch}
        language={language}
        onLanguage={setLanguage}
        languages={languages}
        pill={pill}
        onPill={setPill}
        counts={counts}
        sort={sort}
        onSort={setSort}
      />
      <p className="mt-6 font-mono text-sm text-muted" aria-live="polite">
        {visible.length} {visible.length === 1 ? "repository" : "repositories"}
      </p>
      {visible.length === 0 ? (
        <div className="py-16">
          <EmptyState>No repos match — clear filters.</EmptyState>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <RepoCard key={r.github_id} repo={r} />
          ))}
        </div>
      )}
    </div>
  );
}
