# SKILL.md — github-dashboard

A skill for AI coding agents working on the **GitHub Personal Dashboard** repo.
Load this when the user asks to build, modify, debug, or extend the dashboard.

## When to use

- Any task touching this repo: new features, bug fixes, refactors, deploys.
- Phase 2/3/4 feature implementation (see PRD.md §6 for scoped lists).
- Debugging sync, auth, or UI issues.

## Project map

```
app/                    Next.js App Router
  /(protected)/         middleware-gated pages: /, /repositories, ...
  /login                public login page
  /api/auth/[...path]   Neon Auth handler (proxy to managed Better Auth)
  /api/cron/sync        daily cron (CRON_SECRET-guarded)
  /api/sync/trigger     manual sync (session-guarded)
lib/
  auth/server.ts        createNeonAuth() — handler, middleware, getSession
  auth/client.ts        createAuthClient() — useSession etc.
  db.ts                 @neondatabase/serverless client
  github.ts             GraphQL client, pagination, types
  sync.ts               resumable sync engine (cursor in sync_state)
components/             RepoCard, StatCard, Heatmap, FilterBar, TopBar, ...
db/schema.sql           full DDL (upsert-friendly)
vercel.json             1 daily cron
```

## Stack & commands

- Next.js 14+ (App Router) · TypeScript strict · Tailwind · Neon Postgres ·
  Neon Auth = **Managed Better Auth** (`@neondatabase/auth`) · Vercel Hobby.
- `npm run dev` / `npm run build` (must pass, zero TS errors) / `npm run db:migrate`.

## Architecture rules

1. **Dashboard never calls GitHub on page render.** All reads from Postgres.
2. GitHub token lives server-side only (from Neon Auth `account` record). Never
   import it into client components, never log it.
3. Sync is **resumable + idempotent**: cursor persisted per page in `sync_state`;
   every write is an upsert on GitHub IDs. Never assume a run finishes.
4. One cron only (`0 6 * * *` UTC). Hobby = daily cadence max.
5. Allowlist: `girishlade111`. Enforce in middleware AND in API routes (defense in depth).

## Design rules (DESIGN.md is normative)

- Cream `#faf9f5` canvas · card `#efe9de` · ink `#141413` · coral `#cc785c` (sparingly)
  · dark `#181715` panels (charts/heatmap only).
- Cormorant Garamond 400/500 display, **never bold**; Inter body; JetBrains Mono stats.
- 1.5px Lucide-style line icons; status = filled dots.
- Surface pacing: cream → cream-card → dark-panel → cream. Never two dark bands adjacent.
- New pages/components must include: loading skeletons (cream), empty state (one line),
  error state.

## Common tasks

**Add a Phase 2+ feature:** read PRD.md §6 for its scope → add tables to
`db/schema.sql` (new migration) → extend `lib/sync.ts` or add `lib/<area>.ts` →
add UI under `app/(protected)/` reusing `components/` → update PRD acceptance list.

**Debug sync:** check `sync_state` cursor → run `POST /api/sync/trigger` manually →
read server logs for the failing page → verify token via Neon Auth account row.

**Add a filter/sort:** filtering is client-side over cached rows (Phase 1);
keep it that way until repo count × row size forces server pagination.

## Safety / hard constraints

- FREE TIERS ONLY. Never add a paid dependency, paid API, or usage-based service.
- Never commit `.env*`, tokens, secrets, or the service-role key. `.env.example` only.
- No `any` in `lib/` data layer. No GitHub fetch in React Server Components.
- Don't build Phase 2–4 features unless explicitly asked. Keep PRs scoped.
