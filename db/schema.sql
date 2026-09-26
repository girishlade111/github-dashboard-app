create table if not exists profiles (
  github_id bigint primary key, login text unique not null, name text,
  avatar_url text, bio text, company text, location text,
  followers int default 0, following int default 0,
  public_repos int default 0, total_private_repos int default 0,
  synced_at timestamptz
);
create table if not exists repos (
  github_id bigint primary key, name text not null,
  full_name text unique not null, description text,
  private boolean default false, fork boolean default false,
  archived boolean default false, is_template boolean default false,
  stars int default 0, forks int default 0, open_issues int default 0,
  watchers int default 0, language text, topics text[] default '{}',
  license text, homepage text, default_branch text default 'main',
  created_at timestamptz, updated_at timestamptz, pushed_at timestamptz,
  size_kb int default 0, has_pages boolean default false,
  synced_at timestamptz default now()
);
create index if not exists idx_repos_pushed on repos (pushed_at desc);
create index if not exists idx_repos_stars on repos (stars desc);
create index if not exists idx_repos_fullname on repos (full_name);
create table if not exists repo_languages (
  repo_id bigint references repos(github_id) on delete cascade,
  language text not null, bytes bigint default 0, pct numeric(5,2) default 0,
  primary key (repo_id, language)
);
create table if not exists repo_releases (
  id bigserial primary key, repo_id bigint references repos(github_id) on delete cascade,
  tag_name text, name text, published_at timestamptz,
  is_prerelease boolean default false, html_url text
);
create index if not exists idx_releases_repo on repo_releases (repo_id, published_at desc);
create table if not exists packages (
  id bigserial primary key, repo_id bigint references repos(github_id) on delete set null,
  name text not null, package_type text not null, visibility text,
  version text, html_url text, unique (package_type, name)
);
create table if not exists pages (
  repo_id bigint primary key references repos(github_id) on delete cascade,
  html_url text, status text, custom_domain text
);
create table if not exists contributions (
  login text not null, date date not null, count int default 0,
  primary key (login, date)
);
create table if not exists repo_snapshots (
  repo_id bigint references repos(github_id) on delete cascade,
  date date not null, stars int, forks int, primary key (repo_id, date)
);
create table if not exists user_snapshots (
  login text not null, date date not null, followers int, following int,
  total_stars int, total_repos int, primary key (login, date)
);
create table if not exists sync_state (
  key text primary key, value text, updated_at timestamptz default now()
);
