# SECURITY.md — GitHub Personal Dashboard

## Threat model

Single-user private dashboard. The only person who may see any data is
`girishlade111`. There are no other accounts, no sharing, no public routes.

## Allowlist model

- `lib/auth/allowlist.ts` hardcodes the single allowed GitHub login:
  `girishlade111`.
- `requireUser()` (server-side) validates the session's GitHub token against
  `GET https://api.github.com/user` on every protected page/route load and
  redirects to `/denied` when the login is not allowlisted.
- The proxy (`proxy.ts`) forces all routes except `/login`, `/denied`,
  `/api/auth/*` and static assets through authentication.

## Token handling

- The GitHub OAuth access token lives **only** in the Neon Auth account record
  (Managed Better Auth storage). It is never written to app tables
  (`sync_state` holds only the login string for the cron), never logged, never
  sent to the browser.
- All GitHub API calls happen server-side (`lib/github.ts`, `server-only`).
  Pages render exclusively from Postgres — zero GitHub API calls in page code.
- The login/denied pages are public but reveal nothing: they show no data.

## Cron auth

- `/api/cron/sync` requires `Authorization: Bearer <CRON_SECRET>` compared with
  `crypto.timingSafeEqual` (constant-time). Missing/wrong secret → 401.
- The cron secret is a Vercel environment variable and is also configured in
  Vercel's Cron Jobs settings so the scheduled request carries the header.
- `maxDuration = 60` keeps each chunk inside the Vercel Hobby execution limit.

## Rotating secrets

**CRON_SECRET**
1. Generate: `openssl rand -hex 32`.
2. Vercel → project → Settings → Environment Variables → update `CRON_SECRET`
   (Production) → redeploy (or wait for next deployment).
3. Update the same value in Vercel → Cron Jobs → the `/api/cron/sync` job's
   `Authorization` header.

**NEON_AUTH_COOKIE_SECRET**
1. Generate: `openssl rand -hex 32`.
2. Vercel → Environment Variables → update `NEON_AUTH_COOKIE_SECRET` →
   redeploy. All existing sessions are invalidated (users must sign in again —
   here, just you).

**GitHub OAuth client secret**
1. GitHub → Settings → Developer settings → OAuth Apps → your app →
   **Generate a new client secret**.
2. Neon console → Auth → Providers → GitHub → paste the new secret → Save.
   Old secret stops working immediately; no app redeploy needed.

## Audit checklist

- `grep -rn "ghp_\|gho_\|github_pat_" --include="*.ts" --include="*.tsx" .`
  must show no literal tokens (only env-var *names* like `GITHUB_TOKEN`).
- `grep -ril "CRON_SECRET\|NEON_AUTH_COOKIE_SECRET\|DATABASE_URL" .next/static`
  must return nothing after each production build.
- Never commit `.env.local`; `.env.example` keeps placeholders only.
