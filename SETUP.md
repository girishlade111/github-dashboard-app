# GitHub Personal Dashboard — Setup & Deploy Guide

Private single-user dashboard (`girishlade111`). Stack: Next.js 16 App Router,
Neon Postgres, Neon Auth (Managed Better Auth) + GitHub OAuth, Vercel Hobby.
All free tiers.

Current infra state (26 Sep 2026): Neon account created, AWS Singapore
(`ap-southeast-1`) project exists, Auth already enabled. Steps 3–6 below
remain.

## B. Manual setup

### 1. Neon — copy two values

1. Go to [neon.com](https://neon.com) → open your project (AWS Singapore).
2. **Auth URL**: left nav → **Auth** → **Configuration** tab → copy the **Auth
   URL** → this is `NEON_AUTH_BASE_URL` (looks like
   `https://<project-ref>.neon.tech`).
3. **Connection string**: project **Dashboard** → **Connection Details** →
   select **Pooled connection** → copy the connection string → this is
   `DATABASE_URL`.

### 2. Generate secrets

In a terminal (never paste these into chat, code, or docs):

```bash
openssl rand -hex 32   # → NEON_AUTH_COOKIE_SECRET
openssl rand -hex 32   # → CRON_SECRET
```

### 3. GitHub OAuth App

1. [github.com](https://github.com) → avatar → **Settings** → **Developer
   settings** → **OAuth Apps** → **New OAuth App**.
2. **Application name**: `GitHub Dashboard (personal)`
3. **Homepage URL**: your Vercel production URL (e.g.
   `https://github-dashboard-xyz.vercel.app`)
4. **Authorization callback URL**: `{NEON_AUTH_BASE_URL}/callback/github`
   — replace `{NEON_AUTH_BASE_URL}` with the Auth URL from step 1.
   > Confirm this exact pattern on Neon's **Auth → Providers → GitHub**
   > screen before registering — Neon documents the expected callback there.
5. **Register application** → copy the **Client ID** → **Generate a new client
   secret** → copy the **Client Secret** (shown once).

### 4. Neon GitHub provider

1. Neon console → project → **Auth** → **Providers** → **GitHub**.
2. Paste **Client ID** + **Client Secret**.
3. Scopes: `read:user repo` → **Save**.

### 5. Vercel deploy

1. Push this project to a GitHub repo, then [vercel.com](https://vercel.com) →
   **Add New Project** → **Import** the repo.
2. **Environment Variables** (Production scope):
   - `DATABASE_URL`
   - `NEON_AUTH_BASE_URL`
   - `NEON_AUTH_COOKIE_SECRET`
   - `CRON_SECRET`
3. **Deploy**. The daily cron is already declared in `vercel.json`
   (`/api/cron/sync`, `0 6 * * *` UTC). Vercel Hobby runs crons once daily max.

### 6. Database migration

Locally, with `DATABASE_URL` exported (from `.env.local`, never committed):

```bash
cd app
npm run db:migrate
```

Re-run to verify idempotency (second run must change nothing).

## C. Post-deploy verification

1. Open the production URL → must redirect to `/login`, not `/`.
2. **Sign in with GitHub** as `girishlade111` → lands on `/` with a session.
3. Press **Sync now** → `POST /api/sync/trigger` returns
   `{ status: 'ok' | 'in_progress', reposUpserted }`. Re-press until
   `done: true` (resumable chunks — expected for ~800 repos).
4. `/` shows real profile + 4 KPIs + heatmap + recently-pushed. `/repositories`
   shows all repos; pill counts match; search/sort/filters work; card click
   opens `github.com/{full_name}` in a new tab.
5. Negative tests:
   - `curl https://<app>/api/cron/sync` (no header) → **401**.
   - `curl -H "Authorization: Bearer <CRON_SECRET>" https://<app>/api/cron/sync` → **200**.
   - Log in with a different GitHub account (if available) → `/denied`.
6. Wait for (or manually invoke from Vercel → Cron Jobs) the daily cron →
   Vercel logs show 200 and `sync_state.last_sync` advances.

## D. Acceptance checklist (PRD §10, Phase 1)

- [ ] Allowlisted GitHub login succeeds; session persists; logout works.
- [ ] Non-allowlisted GitHub login → access-denied page, no data visible.
- [ ] `/` shows real profile, 4 KPIs, heatmap, recently-pushed list.
- [ ] `/repositories` shows all repos; counts on pills match; search/sort/filters correct.
- [ ] Card click opens the exact github.com repo URL in a new tab.
- [ ] "Sync now" completes; daily cron runs; interrupted sync resumes from cursor.
- [ ] `npm run build` passes with zero TS errors. ✅ (verified locally, 26 Sep 2026)
- [ ] No secret appears in client JS, logs, or the repo. ✅ (verified locally, 26 Sep 2026 —
      `.env*` gitignored, no real `.env` committed, `.next/static` clean of token/secret patterns)

## E. Hardening notes

- `.env*` is gitignored; no `.env.local` or real values committed. This directory
  is not a git repo yet — before pushing, confirm `git status` shows no `.env*`.
- `.env.example` contains placeholders only.
- Client bundle verified clean: `grep -ril "ghp_\|gho_\|github_pat_\|CRON_SECRET\|NEON_AUTH_COOKIE_SECRET\|DATABASE_URL" .next/static` → no hits.
- See `SECURITY.md` for the allowlist model, token handling, cron auth, and
  secret rotation.
