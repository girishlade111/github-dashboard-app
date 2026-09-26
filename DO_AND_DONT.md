# DO & DON'T — GitHub Personal Dashboard

Engineering, design, product, data, and security rules. Violating these is a bug.

## Product

- ✅ DO keep it private: one user, allowlist-enforced, no public routes with data.
- ✅ DO keep every phase independently shippable.
- ❌ DON'T add multi-user, teams, sharing, or public pages in v1.
- ❌ DON'T build Phase 2–4 features inside a Phase 1 prompt.

## Engineering

- ✅ DO read from Postgres on every page render. Zero GitHub calls in page code.
- ✅ DO make sync resumable (cursor per page in `sync_state`) and idempotent (upserts).
- ✅ DO keep `npm run build` green with zero TypeScript errors; no `any` in `lib/`.
- ✅ DO guard `/api/cron/sync` with `CRON_SECRET` (constant-time compare).
- ✅ DO enforce the allowlist in middleware AND API routes.
- ❌ DON'T put secrets in code, logs, client bundles, or git.
- ❌ DON'T fetch GitHub inside React Server Components or client components.
- ❌ DON'T add paid dependencies or usage-based services (free tiers only).
- ❌ DON'T use more than 1 Vercel cron; DON'T schedule sub-daily on Hobby.

## Design (DESIGN.md is normative)

- ✅ DO anchor every page on cream `#faf9f5`; alternate cream → card → dark panel.
- ✅ DO use Cormorant Garamond 400/500 for display, never bold, -0.02em tracking.
- ✅ DO reserve coral `#cc785c` for primary CTAs, active states, key deltas.
- ✅ DO use 1.5px Lucide-style line icons; status as filled dots.
- ✅ DO include loading skeletons, one-line empty states, and error states.
- ❌ DON'T use pure white, cool grays, or blue/cyan brand accents.
- ❌ DON'T use Inter for display headlines.
- ❌ DON'T add shadows beyond the faint card hover; DON'T use gradients on surfaces.
- ❌ DON'T repeat the same surface in two consecutive bands.

## Data & sync

- ✅ DO upsert on GitHub IDs; store the GraphQL cursor after every page.
- ✅ DO fetch Pages info only for repos reporting pages enabled.
- ✅ DO map packages to repos via `repository.full_name`; tolerate 404s.
- ❌ DON'T call traffic/clones endpoints (need push access — skipped by design).
- ❌ DON'T refetch everything when a cursor resume is possible.

## Security

- ✅ DO read the GitHub token server-side from the Neon Auth `account` record.
- ✅ DO show "Reconnect GitHub" on 401/invalid token.
- ❌ DON'T expose the token to the client, logs, or error messages.
- ❌ DON'T trust `login` from the client; verify the session server-side.
