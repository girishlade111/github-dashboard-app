import "server-only";

import type {
  ContributionsDay,
  GitHubLanguage,
  GitHubPackage,
  GitHubProfile,
  GitHubRelease,
  GitHubRepo,
  PackageType,
  PagesInfo,
  RepoRow,
} from "./types";

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class GitHubAuthError extends Error {
  constructor(message = "GitHub token is invalid or expired") {
    super(message);
    this.name = "GitHubAuthError";
  }
}

export class GitHubRateError extends Error {
  readonly resetAt: Date | null;
  constructor(resetAt: Date | null, message = "GitHub rate limit exceeded") {
    super(message);
    this.name = "GitHubRateError";
    this.resetAt = resetAt;
  }
}

/* ------------------------------------------------------------------ */
/* GraphQL wire types                                                  */
/* ------------------------------------------------------------------ */

interface GraphQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface GraphQLError {
  type?: string;
  message?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: string | null;
}

export interface ReposPage {
  repos: GitHubRepo[];
  pageInfo: GraphQLPageInfo;
  rateLimit: RateLimitInfo | null;
}

/* Re-export the shared GitHub domain types for consumers of this module. */
export type {
  ContributionsDay,
  GitHubLanguage,
  GitHubPackage,
  GitHubProfile,
  GitHubRelease,
  GitHubRepo,
  PackageType,
  PagesInfo,
} from "./types";

/* ------------------------------------------------------------------ */
/* Low-level fetch                                                     */
/* ------------------------------------------------------------------ */

const GRAPHQL_URL = "https://api.github.com/graphql";
const REST_URL = "https://api.github.com";
const USER_AGENT = "github-personal-dashboard";

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": USER_AGENT,
    Accept: "application/vnd.github+json",
  };
}

function checkRateLimit(res: Response): void {
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining === "0") {
    const reset = res.headers.get("x-ratelimit-reset");
    const resetAt = reset ? new Date(Number(reset) * 1000) : null;
    throw new GitHubRateError(resetAt);
  }
}

export async function ghGraphQL<T>(token: string, query: string, variables: Record<string, unknown>): Promise<{ data: T; rateLimit: RateLimitInfo | null }> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (res.status === 401) throw new GitHubAuthError();
  checkRateLimit(res);
  const body = (await res.json()) as GraphQLResponse<T>;
  if (body.errors && body.errors.length > 0) {
    const rateLimited = body.errors.some((e) => e.type === "RATE_LIMITED");
    if (rateLimited) {
      throw new GitHubRateError(null, body.errors.map((e) => e.message).join("; "));
    }
    throw new Error("GitHub GraphQL error: " + body.errors.map((e) => e.message).join("; "));
  }
  if (!body.data) throw new Error("GitHub GraphQL returned no data");
  return { data: body.data, rateLimit: null };
}

/* ------------------------------------------------------------------ */
/* Repos (one page — the sync engine owns the loop)                     */
/* ------------------------------------------------------------------ */

const REPOS_QUERY = `
  query ReposPage($cursor: String) {
    viewer {
      repositories(first: 100, after: $cursor, orderBy: {field: PUSHED_AT, direction: DESC}, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
        pageInfo { hasNextPage endCursor }
        nodes {
          databaseId name nameWithOwner description
          isPrivate isFork isArchived isTemplate
          stargazerCount forkCount
          issues(states: OPEN) { totalCount }
          primaryLanguage { name }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges { size node { name } }
          }
          repositoryTopics(first: 20) { nodes { topic { name } } }
          licenseInfo { name }
          homepageUrl
          defaultBranchRef { name }
          createdAt updatedAt pushedAt
          diskUsage
          hasPagesEnabled
          releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { tagName name publishedAt isPrerelease url }
          }
        }
      }
    }
    rateLimit { limit remaining resetAt }
  }
`;

interface ReposQueryNode {
  databaseId: number;
  name: string;
  nameWithOwner: string;
  description: string | null;
  isPrivate: boolean;
  isFork: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  stargazerCount: number;
  forkCount: number;
  issues: { totalCount: number };
  primaryLanguage: { name: string } | null;
  languages: { edges: { size: number; node: { name: string } }[] };
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  licenseInfo: { name: string } | null;
  homepageUrl: string | null;
  defaultBranchRef: { name: string } | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  diskUsage: number;
  hasPagesEnabled: boolean;
  releases: {
    nodes: {
      tagName: string | null;
      name: string | null;
      publishedAt: string | null;
      isPrerelease: boolean;
      url: string | null;
    }[];
  };
}

interface ReposQueryData {
  viewer: {
    repositories: { pageInfo: GraphQLPageInfo; nodes: ReposQueryNode[] };
  };
  rateLimit: { limit: number; remaining: number; resetAt: string };
}

function mapRepoNode(n: ReposQueryNode): GitHubRepo {
  const total = n.languages.edges.reduce((s, e) => s + e.size, 0);
  const languages: GitHubLanguage[] = n.languages.edges.map((e) => ({
    name: e.node.name,
    size: e.size,
    pct: total > 0 ? (e.size / total) * 100 : 0,
  }));
  const rel = n.releases.nodes[0];
  return {
    databaseId: n.databaseId,
    name: n.name,
    nameWithOwner: n.nameWithOwner,
    description: n.description,
    isPrivate: n.isPrivate,
    isFork: n.isFork,
    isArchived: n.isArchived,
    isTemplate: n.isTemplate,
    stargazerCount: n.stargazerCount,
    forkCount: n.forkCount,
    openIssuesCount: n.issues.totalCount,
    primaryLanguage: n.primaryLanguage?.name ?? null,
    languages,
    topics: n.repositoryTopics.nodes.map((t) => t.topic.name),
    license: n.licenseInfo?.name ?? null,
    homepageUrl: n.homepageUrl,
    defaultBranch: n.defaultBranchRef?.name ?? "main",
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    pushedAt: n.pushedAt,
    diskUsageKb: n.diskUsage,
    hasPagesEnabled: n.hasPagesEnabled,
    latestRelease: rel
      ? {
          tagName: rel.tagName,
          name: rel.name,
          publishedAt: rel.publishedAt,
          isPrerelease: rel.isPrerelease,
          url: rel.url,
        }
      : null,
  };
}

export async function listReposPage(token: string, cursor?: string | null): Promise<ReposPage> {
  const { data } = await ghGraphQL<ReposQueryData>(token, REPOS_QUERY, { cursor: cursor ?? null });
  return {
    repos: data.viewer.repositories.nodes.map(mapRepoNode),
    pageInfo: data.viewer.repositories.pageInfo,
    rateLimit: {
      limit: data.rateLimit.limit,
      remaining: data.rateLimit.remaining,
      resetAt: data.rateLimit.resetAt,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Packages (REST, per type, paged)                                    */
/* ------------------------------------------------------------------ */

interface PackageRest {
  name: string;
  package_type: string;
  visibility: string | null;
  version_count?: number;
  html_url: string;
  repository?: { full_name?: string } | null;
}

export async function getPackages(token: string, packageType: PackageType, page: number): Promise<GitHubPackage[]> {
  const res = await fetch(
    `${REST_URL}/user/packages?package_type=${packageType}&per_page=100&page=${page}`,
    { headers: authHeaders(token), cache: "no-store" }
  );
  if (res.status === 401) throw new GitHubAuthError();
  if (res.status === 404) return []; // package type with zero packages
  checkRateLimit(res);
  if (!res.ok) throw new Error(`GitHub packages request failed: ${res.status}`);
  const body = (await res.json()) as PackageRest[];
  return body.map((p) => ({
    name: p.name,
    package_type: p.package_type,
    visibility: p.visibility ?? null,
    version: null, // version detail requires a per-package call; stored when known
    html_url: p.html_url,
    repository_full_name: p.repository?.full_name ?? null,
  }));
}

/* ------------------------------------------------------------------ */
/* Pages info (REST)                                                   */
/* ------------------------------------------------------------------ */

interface PagesRest {
  html_url?: string;
  status?: string;
  cname?: string | null;
}

export async function getPagesInfo(token: string, owner: string, repo: string): Promise<PagesInfo | null> {
  const res = await fetch(`${REST_URL}/repos/${owner}/${repo}/pages`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (res.status === 401) throw new GitHubAuthError();
  if (res.status === 404) return null;
  checkRateLimit(res);
  if (!res.ok) throw new Error(`GitHub pages request failed: ${res.status}`);
  const body = (await res.json()) as PagesRest;
  return {
    html_url: body.html_url ?? null,
    status: body.status ?? null,
    cname: body.cname ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Profile + contributions (GraphQL)                                   */
/* ------------------------------------------------------------------ */

const PROFILE_QUERY = `
  query Profile($from: DateTime!, $to: DateTime!) {
    viewer {
      databaseId login name avatarUrl bio company location
      followers { totalCount }
      following { totalCount }
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }
`;

interface ProfileQueryData {
  viewer: {
    databaseId: number;
    login: string;
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    company: string | null;
    location: string | null;
    followers: { totalCount: number };
    following: { totalCount: number };
    contributionsCollection: {
      contributionCalendar: {
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
      };
    };
  };
}

export async function getProfileAndContributions(token: string): Promise<{
  profile: GitHubProfile;
  contributions: ContributionsDay[];
}> {
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);
  const { data } = await ghGraphQL<ProfileQueryData>(token, PROFILE_QUERY, {
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const v = data.viewer;
  const days: ContributionsDay[] = [];
  for (const week of v.contributionsCollection.contributionCalendar.weeks) {
    for (const d of week.contributionDays) {
      days.push({ date: d.date, count: d.contributionCount });
    }
  }
  return {
    profile: {
      databaseId: v.databaseId,
      login: v.login,
      name: v.name,
      avatarUrl: v.avatarUrl,
      bio: v.bio,
      company: v.company,
      location: v.location,
      followers: v.followers.totalCount,
      following: v.following.totalCount,
    },
    contributions: days,
  };
}

/* ------------------------------------------------------------------ */
/* Pure mapper: GitHubRepo -> DB RepoRow (used by the sync engine)      */
/* ------------------------------------------------------------------ */

export function toRepoRow(g: GitHubRepo): RepoRow {
  return {
    github_id: g.databaseId,
    name: g.name,
    full_name: g.nameWithOwner,
    description: g.description,
    private: g.isPrivate,
    fork: g.isFork,
    archived: g.isArchived,
    is_template: g.isTemplate,
    stars: g.stargazerCount,
    forks: g.forkCount,
    open_issues: g.openIssuesCount,
    watchers: 0, // GraphQL stargazerCount covers it; REST watchers skipped by design
    language: g.primaryLanguage,
    topics: g.topics,
    license: g.license,
    homepage: g.homepageUrl,
    default_branch: g.defaultBranch,
    created_at: g.createdAt,
    updated_at: g.updatedAt,
    pushed_at: g.pushedAt,
    size_kb: g.diskUsageKb,
    has_pages: g.hasPagesEnabled,
    synced_at: null,
  };
}
