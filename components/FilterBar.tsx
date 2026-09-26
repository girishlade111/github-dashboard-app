"use client";

export type RepoPill = "all" | "public" | "private" | "forks" | "archived";
export type RepoSort = "stars" | "pushed" | "name";

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  language: string;
  onLanguage: (v: string) => void;
  languages: string[];
  pill: RepoPill;
  onPill: (v: RepoPill) => void;
  counts: Record<RepoPill, number>;
  sort: RepoSort;
  onSort: (v: RepoSort) => void;
}

const PILLS: { key: RepoPill; label: string }[] = [
  { key: "all", label: "All" },
  { key: "public", label: "Public" },
  { key: "private", label: "Private" },
  { key: "forks", label: "Forks" },
  { key: "archived", label: "Archived" },
];

const SORTS: { key: RepoSort; label: string }[] = [
  { key: "stars", label: "Stars ↓" },
  { key: "pushed", label: "Recently pushed" },
  { key: "name", label: "Name A–Z" },
];

const inputClass =
  "rounded-lg border border-hairline bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-muted-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function FilterBar({
  search,
  onSearch,
  language,
  onLanguage,
  languages,
  pill,
  onPill,
  counts,
  sort,
  onSort,
}: FilterBarProps) {
  return (
    <div className="sticky top-16 z-20 -mx-6 border-b border-hairline bg-canvas/95 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name, description, topics, language…"
          aria-label="Search repositories"
          className={`${inputClass} w-64 max-w-full`}
        />
        <select
          value={language}
          onChange={(e) => onLanguage(e.target.value)}
          aria-label="Filter by language"
          className={inputClass}
        >
          <option value="">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as RepoSort)}
          aria-label="Sort repositories"
          className={inputClass}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Repository filters">
        {PILLS.map((p) => {
          const active = pill === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onPill(p.key)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.15em] transition-colors ${
                active
                  ? "bg-surface-strong text-ink"
                  : "bg-surface-card text-muted hover:bg-surface-strong hover:text-ink"
              }`}
            >
              {p.label}{" "}
              <span className="font-mono normal-case tracking-normal text-muted-soft">
                {counts[p.key]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
