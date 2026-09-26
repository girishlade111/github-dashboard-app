"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "./ui";

/* 1.5px-stroke Lucide-style line icons, hand-drawn paths. */
function Icon({ d, label }: { d: string; label: string }) {
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
      aria-label={label}
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home: "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z",
  layers: "m12 2 9 5-9 5-9-5 9-5z M3 12l9 5 9-5 M3 17l9 5 9-5",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3",
  refresh:
    "M21 12a9 9 0 1 1-2.64-6.36 M21 3v6h-6",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a2 2 0 0 0 3.4 0",
} as const;

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/repositories", label: "Repositories" },
];

interface TopBarProps {
  syncLabel?: string;
  onSyncNow?: () => void;
  showConnect?: boolean;
  avatarUrl?: string;
}

export default function TopBar({ syncLabel, onSyncNow, showConnect = false, avatarUrl }: TopBarProps) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const avatar = session?.user?.image ?? avatarUrl ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-6">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2" aria-label="Ledger home">
          <span className="font-display text-2xl font-normal tracking-[-0.02em] text-ink">
            Ledger
          </span>
          <span className="text-primary" aria-hidden="true">
            ✳
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6" aria-label="Primary">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative py-1 text-sm font-medium ${
                  active ? "text-primary" : "text-body hover:text-ink"
                } ${active ? "after:absolute after:-bottom-[1px] after:left-0 after:h-[2px] after:w-full after:bg-primary" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          {/* Search trigger */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-canvas text-muted hover:text-ink"
            aria-label="Search (⌘K)"
            title="Search — coming soon (⌘K)"
          >
            <Icon d={ICONS.search} label="Search" />
          </button>

          {/* Sync status */}
          {syncLabel && (
            <span className="flex items-center gap-2 font-mono text-xs text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-teal" aria-hidden="true" />
              Synced {syncLabel} ago
            </span>
          )}

          {onSyncNow && (
            <Button onClick={onSyncNow} aria-label="Sync now">
              <span aria-hidden="true">
                <Icon d={ICONS.refresh} label="Sync icon" />
              </span>
              Sync now
            </Button>
          )}

          {showConnect && (
            <a
              href="/api/github/connect"
              aria-label="Connect GitHub full access"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-hairline bg-canvas px-5 text-sm font-medium leading-none text-ink transition-colors hover:border-muted-soft"
            >
              Connect GitHub full access
            </a>
          )}

          {/* Avatar + sign out */}
          {avatar ? (
            <img src={avatar} alt="Profile" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-card text-sm text-muted"
              aria-hidden="true"
            >
              G
            </span>
          )}
          {session?.user && (
            <button
              type="button"
              onClick={() => authClient.signOut()}
              className="text-sm font-medium text-muted hover:text-ink"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
