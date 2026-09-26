/* Shared DB + GitHub row shapes. No `any` anywhere. */

export interface ProfileRow {
  github_id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  following: number;
  public_repos: number;
  total_private_repos: number;
  synced_at: string | null;
}

export interface RepoRow {
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
  watchers: number;
  language: string | null;
  topics: string[];
  license: string | null;
  homepage: string | null;
  default_branch: string;
  created_at: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  size_kb: number;
  has_pages: boolean;
  synced_at: string | null;
}

export interface LanguageRow {
  language: string;
  bytes: number;
  pct: number;
}

export interface ReleaseRow {
  repo_id: number;
  tag_name: string | null;
  name: string | null;
  published_at: string | null;
  is_prerelease: boolean;
  html_url: string | null;
}

export interface PackageRow {
  repo_id: number | null;
  name: string;
  package_type: string;
  visibility: string | null;
  version: string | null;
  html_url: string | null;
}

export interface PagesRow {
  repo_id: number;
  html_url: string | null;
  status: string | null;
  custom_domain: string | null;
}

export interface ContributionRow {
  login: string;
  date: string; // YYYY-MM-DD
  count: number;
}

/* ------------------------------------------------------------------ */
/* GitHub API domain types (mirrors lib/github.ts selections)          */
/* ------------------------------------------------------------------ */

export interface GitHubLanguage {
  name: string;
  size: number;
  pct: number;
}

export interface GitHubRelease {
  tagName: string | null;
  name: string | null;
  publishedAt: string | null;
  isPrerelease: boolean;
  url: string | null;
}

export interface GitHubRepo {
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
  openIssuesCount: number;
  primaryLanguage: string | null;
  languages: GitHubLanguage[];
  topics: string[];
  license: string | null;
  homepageUrl: string | null;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string | null;
  diskUsageKb: number;
  hasPagesEnabled: boolean;
  latestRelease: GitHubRelease | null;
}

export interface GitHubPackage {
  name: string;
  package_type: string;
  visibility: string | null;
  version: string | null;
  html_url: string | null;
  repository_full_name: string | null;
}

export interface PagesInfo {
  html_url: string | null;
  status: string | null;
  cname: string | null;
}

export interface GitHubProfile {
  databaseId: number;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  followers: number;
  following: number;
}

export interface ContributionsDay {
  date: string;
  count: number;
}

export type PackageType = "npm" | "container" | "maven" | "rubygems" | "nuget";
