import { timeAgo } from "@/lib/format";

export interface PushedRepo {
  name: string;
  full_name: string;
  pushed_at: string | null;
}

function CommitIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Repository"
      className="shrink-0 text-muted"
    >
      <path d="M12 3v18 M5 8l7-5 7 5 M5 16l7 5 7-5" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

export default function RecentlyPushed({ repos }: { repos: PushedRepo[] }) {
  return (
    <section aria-label="Recently pushed">
      <h2 className="font-display text-4xl font-normal tracking-[-0.02em] text-ink">
        Recently pushed
      </h2>
      <ul className="mt-6">
        {repos.map((r) => (
          <li key={r.full_name} className="border-t border-hairline-soft first:border-t-0">
            <div className="flex items-center gap-4 py-4">
              <CommitIcon />
              <a
                href={`https://github.com/${r.full_name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-display text-[22px] font-normal tracking-[-0.02em] text-ink hover:text-primary"
              >
                {r.name}
              </a>
              <span className="ml-auto shrink-0 font-mono text-xs text-muted">
                {timeAgo(r.pushed_at)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
