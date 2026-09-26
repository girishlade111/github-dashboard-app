import Link from "next/link";
import { Suspense } from "react";
import Heatmap from "@/components/Heatmap";
import GitHubConnectStatus from "@/components/GitHubConnectStatus";
import ProfileHeader from "@/components/ProfileHeader";
import RecentlyPushed, { type PushedRepo } from "@/components/RecentlyPushed";
import StatCard from "@/components/StatCard";
import { Banner, Button, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getSyncState, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ProfileDbRow {
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  following: number;
}

interface RepoAgg {
  total_repos: number;
  total_stars: number;
  total_forks: number;
}

interface SnapshotRow {
  date: string;
  followers: number;
  following: number;
  total_stars: number;
  total_repos: number;
}

interface ContributionDbRow {
  date: string;
  count: number;
}

export default async function OverviewPage() {
  const user = await requireUser();

  const [status, lastSync] = await Promise.all([
    getSyncState("status"),
    getSyncState("last_sync"),
  ]);

  const profileRows = (await sql`
    select login, name, avatar_url, bio, company, location, followers, following
    from profiles order by synced_at desc nulls last limit 1
  `) as ProfileDbRow[];
  const profile = profileRows[0] ?? null;

  if (!profile) {
    return (
      <section className="py-24">
        <Suspense>
          <GitHubConnectStatus />
        </Suspense>
        {status === "auth_failed" && (
          <div className="mb-8">
            <Banner tone="amber">
              <span className="font-medium">GitHub connection expired.</span> Reconnect
              GitHub to resume syncing.{" "}
              <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                Reconnect
              </Link>
            </Banner>
          </div>
        )}
        <EmptyState>No data yet — press Sync now.</EmptyState>
      </section>
    );
  }

  const login = profile.login || user.login;

  const [aggRaw, snapRaw, contribRaw, recentRaw] = await Promise.all([
    sql`select count(*)::int as total_repos, coalesce(sum(stars),0)::int as total_stars, coalesce(sum(forks),0)::int as total_forks from repos`,
    sql`select date, followers, following, total_stars, total_repos from user_snapshots where login = ${login} order by date desc limit 14`,
    sql`select date, count from contributions where login = ${login} and date >= current_date - interval '365 days' order by date`,
    sql`select name, full_name, pushed_at from repos order by pushed_at desc nulls last limit 8`,
  ]);
  const aggRows = aggRaw as RepoAgg[];
  const snapshotRows = snapRaw as SnapshotRow[];
  const contribRows = contribRaw as ContributionDbRow[];
  const recentRows = recentRaw as PushedRepo[];

  const agg = aggRows[0] ?? { total_repos: 0, total_stars: 0, total_forks: 0 };
  const latest = snapshotRows[0] ?? null;
  const prev = snapshotRows[1] ?? null;
  const delta = (cur: number | undefined, old: number | undefined): number | null =>
    cur == null || old == null ? null : cur - old;

  // Sparkline series (oldest → newest) for the snapshot-backed cards
  const spark = (pick: (s: SnapshotRow) => number): number[] | undefined => {
    const series = [...snapshotRows].reverse().map(pick);
    return series.length > 1 ? series : undefined;
  };

  return (
    <div className="pb-16">
      <Suspense>
        <GitHubConnectStatus />
      </Suspense>
      {status === "auth_failed" && (
        <div className="mt-8">
          <Banner tone="amber">
            <span className="font-medium">GitHub connection expired.</span>{" "}
            <Link href="/login">
              <Button variant="primary" className="ml-4">
                Reconnect GitHub
              </Button>
            </Link>
          </Banner>
        </div>
      )}

      <ProfileHeader
        name={profile.name}
        login={login}
        avatarUrl={profile.avatar_url}
        bio={profile.bio}
        company={profile.company}
        location={profile.location}
        followers={profile.followers}
        following={profile.following}
      />

      <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key stats">
        <StatCard
          label="Total repositories"
          value={agg.total_repos}
          delta={delta(latest?.total_repos, prev?.total_repos)}
          spark={spark((s) => s.total_repos)}
        />
        <StatCard
          label="Total stars"
          value={agg.total_stars}
          delta={delta(latest?.total_stars, prev?.total_stars)}
          spark={spark((s) => s.total_stars)}
        />
        <StatCard
          label="Followers"
          value={profile.followers}
          delta={delta(latest?.followers, prev?.followers)}
          spark={spark((s) => s.followers)}
        />
        <StatCard
          label="Forks"
          value={agg.total_forks}
          delta={null}
        />
      </section>

      <div className="mt-12">
        <Heatmap days={contribRows.map((c) => ({ date: String(c.date).slice(0, 10), count: c.count }))} />
      </div>

      <div className="mt-12">
        <RecentlyPushed repos={recentRows} />
      </div>

      {lastSync && (
        <p className="mt-12 font-mono text-xs text-muted-soft">
          Last synced {new Date(lastSync).toLocaleString("en-US")}
        </p>
      )}
    </div>
  );
}
