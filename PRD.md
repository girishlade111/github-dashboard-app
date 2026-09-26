# GitHub Personal Dashboard — Product Requirements Document

**Version:** 1.0 · **Date:** 2026-09-26 · **Owner:** Girish Lade (`girishlade111`)
**Status:** Planning complete → Phase 1 build · **Repo:** (to be created)

---

## 1. Overview

A **private, single-user web application** that presents the owner's entire GitHub
footprint — 800+ public and private repositories — as a rich, searchable, editorial-style
dashboard. GitHub data is synced into Neon Postgres on a schedule; the dashboard reads
**only** from Postgres and never calls the GitHub API during page renders.

## 2. Problem

- github.com shows a limited, public-only view; private repos are invisible in one place.
- No unified inventory across 800+ repos: which have Pages sites, published packages,
  missing licenses, or went stale is unknowable at a glance.
- No trend data: stars/followers growth, language evolution, contribution streaks.
- Existing "GitHub stats" tools are public-profile toys; none handle private repos,
  packages, or hygiene at this scale.

## 3. Goals

1. One daily-driver dashboard for the owner's whole GitHub universe.
2. Page loads < 1s (all reads from cache).
3. 100% free tiers: GitHub Free + Neon Free + Vercel Hobby. Zero paid features.
4. Private by default: exactly one human can ever log in.

## 4. Non-goals

- Not a Git client: no cloning, pushing, or code editing (v1).
- No repo management writes in v1 (archive/edit topics = later phase, needs write scope).
- No multi-user, teams, or public sharing in v1.
- No traffic/clones analytics (requires push access; skipped by design).

## 5. Users

Exactly one: GitHub user `girishlade111`. Access is enforced by an **allowlist check**
after OAuth — any other GitHub identity lands on an access-denied page.

## 6. Functional requirements

### Phase 1 — Core (build now)

**F1.1 Authentication**
- GitHub OAuth via Neon Auth (Managed Better Auth).
- Requested scopes: `read:user`, `repo` (private repo listing needs `repo`).
- Post-login allowlist: `login === "girishlade111"` else access-denied page.
- All routes except `/login` require a valid session (middleware).

**F1.2 Sync engine**
- Daily Vercel Cron (`/api/cron/sync`, `CRON_SECRET`-guarded) + manual "Sync now"
  button (session-protected `POST /api/sync/trigger`).
- GitHub access token read **server-side only** from the Neon Auth `account` record.
- Repos via GraphQL `viewer.repositories` (100/page, cursor-paginated, ~8 pages for 800).
- Packages via REST `/user/packages` per type; mapped to repos by `repository.full_name`.
- Pages via REST per repo, only where the repo reports pages enabled.
- Profile + 1-year contributions via GraphQL.
- **Resumable + idempotent:** cursor persisted in `sync_state` after each page;
  chunked to survive Vercel Hobby function duration limits; upserts everywhere.
- Token missing/expired → sync marked failed + "Reconnect GitHub" banner.

**F1.3 Overview page (`/`)**
- Profile header: avatar (80px circle), serif display name, @login, bio,
  company/location (line icons), followers / following.
- 4 KPI stat cards: Total repositories · Total stars · Followers · Forks
  (serif numerals, small-caps labels, coral/teal delta vs previous sync).
- Contribution heatmap: dark panel, 12 months, cream labels.
- "Recently pushed" list (top 8): serif repo name (link), mono relative time.

**F1.4 Repositories page (`/repositories`)**
- Toolbar (sticky): search input (name, description, topics, language),
  language dropdown, pills All/Public/Private/Forks/Archived with live counts,
  sort (Stars ↓ · Recently pushed · Name A–Z).
- Responsive card grid (3-up desktop / 2-up tablet / 1-up mobile) + result count.
- Repo card: serif name + badges (Private/Public/Fork/Archived/Template),
  2-line description, stats row (stars, forks, open issues — line icons + mono numerals),
  GitHub stacked language bar + legend, topic pills, latest release tag,
  homepage link, Pages URL + status, packages list, footer `license · pushed {relative}`.
- Card click → GitHub repo URL in new tab. Empty state: one-line guidance.

### Phase 2 — Insights (later)
Daily star/fork snapshots + sparklines; repo health score + "fix me" list; stale repo
detector (6+ months); duplicate detector (fuzzy names); hygiene report (missing
description/topics/license); portfolio language donut + evolution timeline; top repos
leaderboard; weekly digest; release timeline; year-in-review; coding streak; CSV/JSON export.

### Phase 3 — Activity & social (later)
Recent activity feed (commits + repos); starred repos + interest/topic cloud; authored
PRs + assigned issues; triage kanban board; followers/following + non-follow-back list;
follower growth chart; gists; npm download stats; on-this-day.

### Phase 4 — Power & polish (later)
Smart collections; webhook realtime sync; failing-builds widget; repo relationship
graph; Cmd+K command palette; on-demand README preview; repo compare mode; goal
tracking; code search; PWA; Marathi UI toggle.

### Backlog / v2
Repo manager (write scope: archive, edit description/topics, bulk actions);
Dependabot/security alerts; Copilot usage (verify API support first);
public showcase slice; weekly email digest.

## 7. Data model

`profiles`, `repos`, `repo_languages`, `repo_releases`, `packages`, `pages`,
`contributions`, `repo_snapshots`, `user_snapshots`, `sync_state`.
Full DDL in `db/schema.sql` (Prompt 2). All writes are upserts keyed on GitHub IDs.

## 8. Design

Anthropic editorial system — see `DESIGN.md` (normative).
Cream `#faf9f5` · coral `#cc785c` · dark `#181715` · Cormorant Garamond display
(400/500, never bold) · Inter body · JetBrains Mono stats · 1.5px Lucide-style icons.

## 9. Technical constraints

- Stack: Next.js 14+ App Router, TypeScript (strict, no `any` in data layer),
  Tailwind CSS, `@neondatabase/serverless`, `@neondatabase/auth`, Vercel Hobby.
- Free tiers only. If an API needs a paywall, skip the feature.
- Secrets in env vars only (`DATABASE_URL`, `NEON_AUTH_BASE_URL`,
  `NEON_AUTH_COOKIE_SECRET`, `CRON_SECRET`). Never in code, logs, or client bundles.
- Dashboard performs zero GitHub API calls during page renders.
- API budget: full sync ≈ 8 GraphQL pages + package pagination + Pages checks
  (enabled repos only) — far under 5,000 req/hour.
- Neon region: AWS (Managed Auth is AWS-only). Current: ap-southeast-1.

## 10. Acceptance criteria

**Phase 1**
- [ ] Allowlisted GitHub login succeeds; session persists; logout works.
- [ ] Non-allowlisted GitHub login → access-denied page, no data visible.
- [ ] `/` shows real profile, 4 KPIs, heatmap, recently-pushed list.
- [ ] `/repositories` shows all repos; counts on pills match; search/sort/filters correct.
- [ ] Card click opens the exact github.com repo URL in a new tab.
- [ ] "Sync now" completes; daily cron runs; interrupted sync resumes from cursor.
- [ ] `npm run build` passes with zero TS errors.
- [ ] No secret appears in client JS, logs, or the repo.

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Hobby function duration kills long sync | Resumable chunked sync, cursor in `sync_state` |
| GitHub token expiry | Detect 401 → failed-sync banner + reconnect CTA |
| Neon Auth GitHub provider misconfigured | Step-by-step prompt 8; console shows callback URL |
| Scope creep into Phase 2+ | Prompts hard-scope each step; "do NOT build" lists |

## 12. Build sequence (maps to prompts)

1. Scaffolding → 2. Database → 3. Auth → 4. GitHub client → 5. Sync engine →
6. Overview page → 7. Repositories page → 8. Deploy & verify.
Each prompt is independent and self-contained (fresh-chat safe).
