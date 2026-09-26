import { langColor } from "@/lib/langColors";
import { timeAgo } from "@/lib/format";
import { Pill } from "./ui";

/** Serialized repo row passed from the server page to the client grid. */
export interface RepoCardData {
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
  languages: { language: string; pct: number }[];
  topics: string[];
  license: string | null;
  homepage: string | null;
  pushed_at: string | null;
  latest_release: { tag_name: string | null; html_url: string | null } | null;
  packages: { package_type: string; name: string; version: string | null }[];
  pages: { html_url: string | null; status: string | null } | null;
  repo_url: string;
}

function LineIcon({ d, label }: { d: string; label: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
      className="shrink-0 text-muted"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  star: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z",
  fork: "M6 3v12 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9",
  issues: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 8v4 M12 16h.01",
  external:
    "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3",
  tag: "M20.59 13.41L10.59 3.41A2 2 0 0 0 9.17 3H4a1 1 0 0 0-1 1v5.17a2 2 0 0 0 .59 1.42l10 10a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z M7 7h.01",
  package: "M16.5 9.4L7.5 4.21 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.29 7L12 12l8.71-5 M12 22V12",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a15 15 0 0 1 0 18 M12 3a15 15 0 0 0 0 18",
} as const;

function MetaRow({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 flex items-center gap-2 text-sm text-body">{children}</div>;
}

export default function RepoCard({ repo }: { repo: RepoCardData }) {
  const badges: string[] = [repo.private ? "Private" : "Public"];
  if (repo.fork) badges.push("Fork");
  if (repo.archived) badges.push("Archived");
  if (repo.is_template) badges.push("Template");

  /* Whole-card click target. A <div role="link"> is used instead of a nested
     <a> because inner links (release/homepage/pages) inside an outer <a>
     are invalid HTML — the parser would close the outer anchor early. */
  function openRepo() {
    window.open(repo.repo_url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`${repo.full_name} — open on GitHub`}
      onClick={openRepo}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openRepo();
        }
      }}
      className="flex h-full cursor-pointer flex-col rounded-xl bg-surface-card p-6 transition-shadow hover:shadow-[0_1px_3px_rgba(20,20,19,0.08)]"
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 truncate font-display text-[22px] font-normal tracking-[-0.02em] text-ink">
          {repo.name}
        </h3>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {badges.map((b) => (
            <Pill
              key={b}
              className={b === "Private" ? "bg-primary/15! text-primary!" : ""}
            >
              {b}
            </Pill>
          ))}
        </div>
      </div>

      {repo.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-body">{repo.description}</p>
      )}

      <div className="mt-3 flex items-center gap-5 font-mono text-sm text-body">
        <span className="flex items-center gap-1.5">
          <LineIcon d={ICONS.star} label="Stars" />
          {repo.stars.toLocaleString("en-US")}
        </span>
        <span className="flex items-center gap-1.5">
          <LineIcon d={ICONS.fork} label="Forks" />
          {repo.forks.toLocaleString("en-US")}
        </span>
        <span className="flex items-center gap-1.5">
          <LineIcon d={ICONS.issues} label="Open issues" />
          {repo.open_issues.toLocaleString("en-US")}
        </span>
      </div>

      {repo.languages.length > 0 && (
        <div className="mt-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full" aria-hidden="true">
            {repo.languages.map((l) => (
              <span
                key={l.language}
                style={{ width: `${l.pct}%`, background: langColor(l.language) }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {repo.languages.map((l) => (
              <span key={l.language} className="flex items-center gap-1.5" title={`${l.pct.toFixed(1)}%`}>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: langColor(l.language) }}
                  aria-hidden="true"
                />
                {l.language}
                <span className="font-mono">{l.pct.toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {repo.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {repo.topics.map((t) => (
            <span
              key={t}
              className="rounded-full bg-surface-soft px-2.5 py-1 text-xs uppercase tracking-[0.15em] text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {(repo.latest_release || repo.homepage || repo.pages || repo.packages.length > 0) && (
        <div className="mt-3">
          {repo.latest_release && (
            <MetaRow>
              <LineIcon d={ICONS.tag} label="Latest release" />
              {repo.latest_release.html_url ? (
                <span
                  onClick={(e) => e.stopPropagation()}
                  className="truncate"
                >
                  <a
                    href={repo.latest_release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {repo.latest_release.tag_name ?? "release"}
                  </a>
                </span>
              ) : (
                <span className="truncate font-mono text-xs">{repo.latest_release.tag_name ?? "release"}</span>
              )}
            </MetaRow>
          )}
          {repo.homepage && (
            <MetaRow>
              <LineIcon d={ICONS.external} label="Homepage" />
              <span onClick={(e) => e.stopPropagation()} className="truncate">
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-primary hover:underline"
                >
                  {repo.homepage.replace(/^https?:\/\//, "")}
                </a>
              </span>
            </MetaRow>
          )}
          {repo.pages?.html_url && (
            <MetaRow>
              <LineIcon d={ICONS.globe} label="GitHub Pages" />
              <span onClick={(e) => e.stopPropagation()} className="flex min-w-0 items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: repo.pages.status === "built" ? "#5db872" : "#e8a55a" }}
                  aria-hidden="true"
                />
                <a
                  href={repo.pages.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-primary hover:underline"
                >
                  {repo.pages.html_url.replace(/^https?:\/\//, "")}
                </a>
              </span>
            </MetaRow>
          )}
          {repo.packages.length > 0 && (
            <MetaRow>
              <LineIcon d={ICONS.package} label="Packages" />
              <span className="truncate font-mono text-xs text-muted">
                {repo.packages
                  .map((p) => `${p.package_type}: ${p.name}${p.version ? `@${p.version}` : ""}`)
                  .join(" · ")}
              </span>
            </MetaRow>
          )}
        </div>
      )}

      <div className="mt-auto pt-4 font-mono text-xs text-muted-soft">
        {repo.license ?? "no license"} · pushed {timeAgo(repo.pushed_at)}
      </div>
    </div>
  );
}
