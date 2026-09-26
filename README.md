# GitHub Personal Dashboard (Codename: Ledger)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/Neon-Postgres_Serverless-00e599?style=flat&logo=postgresql)](https://neon.tech/)
[![Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A private, single-user web application engineered to present an entire GitHub footprint—800+ public and private repositories—as a high-performance, editorial-style personal dashboard.

---

## 📖 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Database Schema](#-database-schema)
- [Project Directory Structure](#-project-directory-structure)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Running Migrations](#running-migrations)
  - [Development Server](#development-server)
- [Sync Engine & Background Jobs](#-sync-engine--background-jobs)
- [Deployment Guide (Neon + Vercel)](#-deployment-guide-neon--vercel)
- [Security & Access Control](#-security--access-control)
- [Available Scripts](#-available-scripts)
- [Author](#-author)

---

## 🏛 Overview & Architecture

Standard GitHub profile pages only highlight a small, public slice of a developer's work. Navigating 800+ repositories across personal projects, experiments, forks, and client work is cumbersome, with zero unified visibility into:
- Total cross-portfolio hygiene (missing licenses, descriptions, outdated dependencies)
- Repositories running GitHub Pages or publishing GitHub Packages
- Combined contribution trajectories and private commit volume

**Ledger** solves this with a **zero-runtime-API** model:
1. **GitHub API is never called on render:** All web requests read directly from a local Neon Serverless Postgres replica. Page loads render under **1 second**.
2. **Resumable & Idempotent Sync:** A background sync engine paginates GraphQL and REST endpoints, saving checkpoint cursors to survive Vercel serverless execution limits.
3. **100% Free Tiers:** Designed entirely within GitHub Free, Neon Free tier (AWS Singapore / `ap-southeast-1`), and Vercel Hobby.
4. **Single-User Allowlist:** Strictly guarded by GitHub OAuth via Neon Auth; only the designated owner (`girishlade111`) can access data.

---

## ✨ Key Features

### 1. Executive Overview (`/`)
- **Profile Header:** Avatar, serif display typography, GitHub handle, bio, company/location tags, and follower/following counters.
- **KPI Stat Cards:** 4 live metrics—Total Repositories, Total Stars, Followers, and Forks—with previous-sync diff tracking.
- **Contribution Heatmap:** 12-month calendar heatmap visualizing full commit activity in an Anthropic-inspired editorial aesthetic.
- **Recently Pushed Repositories:** Fast-access list of the latest 8 actively pushed repositories with relative timestamps.

### 2. Repositories Explorer (`/repositories`)
- **Sticky Filter & Search Bar:** Real-time search across repository names, descriptions, languages, and topics.
- **Dynamic Segment Pills:** Fast filters for **All**, **Public**, **Private**, **Forks**, and **Archived** with real-time count badges.
- **Multi-Criteria Sorting:** Sort by Stars (descending), Recently Pushed, or Alphabetical (A–Z).
- **Rich Repository Cards:**
  - Badges: `Public`, `Private`, `Fork`, `Archived`, `Template`
  - Stacked GitHub language ratio bar with color indicators
  - Topic pills and release tags
  - Direct links to repository, homepage, active GitHub Pages, and published Packages
  - License detection and last-pushed relative timestamp

### 3. Resumable GitHub Sync Engine
- **Cursor-based GraphQL Pagination:** Efficiently traverses 800+ repos at 100 nodes per page.
- **Chunked Execution:** Persists pagination cursors in `sync_state` so timeouts resume seamlessly.
- **REST Enrichments:** Fetches packages (`/user/packages`), Pages status, releases, and detailed language byte counts.
- **Triggers:** Automated daily cron via Vercel Cron (`0 6 * * *` UTC) and on-demand manual trigger button with live progress indicator.

---

## 🛠 Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | Server-first React 19 architecture with streaming |
| **UI & Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern CSS variables, responsive editorial design |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict end-to-end type safety |
| **Database** | [Neon Postgres](https://neon.tech/) | Serverless PostgreSQL with connection pooling |
| **Auth** | [Neon Auth](https://neon.tech/docs/guides/neon-auth) / Better Auth | GitHub OAuth provider with server-side token storage |
| **Data Sync** | GitHub GraphQL & REST APIs | Cursor-based synchronization and metadata enrichment |
| **Hosting & Cron** | [Vercel](https://vercel.com/) | Serverless deployment with daily scheduled crons |

---

## 🔄 System Architecture & Data Flow

```
+--------------------+        OAuth Login         +------------------------+
|                    | -------------------------> |                        |
|   GitHub User      |                            |       Neon Auth        |
|  (girishlade111)   | <------------------------- | (Managed Better Auth)  |
+--------------------+    Session Cookie Set      +------------------------+
         |                                                    |
         | Navigates dashboard                                | Stores encrypted
         v                                                    | GitHub OAuth token
+------------------------------------+                        v
| Next.js App Router (Vercel)        |              +----------------------+
| - Overview (/)                     |              |                      |
| - Repositories (/repositories)     | <----------> | Neon Postgres        |
| - Fast DB-only reads (<1s load)    |              | - profiles           |
+------------------------------------+              | - repos              |
         ^                                          | - repo_languages     |
         | Cron / Manual Trigger                    | - contributions      |
+------------------------------------+              | - sync_state         |
| Sync Engine (/api/cron/sync)       |              |                      |
| - Cursor pagination via GraphQL    | -----------> +----------------------+
| - Fetches Repos, Pages, Packages   | Upsert Data              ^
+------------------------------------+                          |
         |                                                      |
         +-------------> GitHub API (v4 GraphQL / REST) --------+
```

---

## 🗄 Database Schema

The database utilizes Neon Postgres with indexed relations designed for fast reads:

- **`profiles`**: GitHub user profile, bio, followers, repository counters, and sync timestamps.
- **`repos`**: Primary repository inventory (id, full name, stars, forks, visibility, license, pushed timestamps, etc.).
- **`repo_languages`**: Language byte counts and calculated percentages per repository.
- **`repo_releases`**: Published releases and tags per repository.
- **`packages`**: Published GitHub Packages mapped to repositories.
- **`pages`**: GitHub Pages deployment status and custom domain information.
- **`contributions`**: Daily contribution calendar counts for the 12-month heatmap.
- **`repo_snapshots` & `user_snapshots`**: Historical metrics tracking daily star/follower changes.
- **`sync_state`**: Key-value store tracking resumable GraphQL pagination cursors and status.

---

## 📁 Project Directory Structure

```
├── app/
│   ├── (protected)/           # Authenticated & allowlisted routes
│   │   ├── page.tsx           # Overview page (KPIs, heatmap, recent repos)
│   │   └── repositories/      # Repositories browser page
│   ├── api/
│   │   ├── auth/              # Neon Auth callback proxies
│   │   ├── cron/sync/         # Vercel daily cron endpoint (CRON_SECRET guarded)
│   │   └── sync/trigger/      # Manual sync trigger endpoint
│   ├── denied/                # Access denied screen for non-allowlisted accounts
│   ├── login/                 # Login screen with GitHub OAuth button
│   ├── globals.css            # Tailwind CSS v4 styling & theme setup
│   └── layout.tsx             # Root layout with editorial font configuration
├── components/
│   ├── FilterBar.tsx          # Sticky search & filter toolbar
│   ├── Heatmap.tsx            # 12-month GitHub contribution matrix
│   ├── ProfileHeader.tsx      # Header with user bio and metadata
│   ├── RecentlyPushed.tsx     # Recent activity list
│   ├── RepoCard.tsx           # Individual repository card with languages & tags
│   ├── RepoGrid.tsx           # Responsive 3-column / 2-column repository grid
│   ├── StatCard.tsx           # Stat metric display with deltas
│   ├── TopBar.tsx             # Top navigation with avatar, sync status & actions
│   └── ui.tsx                 # Atomic buttons, badges, and icon primitives
├── db/
│   ├── migrations/            # SQL migration versions
│   ├── migrate.ts             # Migration runner script (tsx)
│   └── schema.sql             # Canonical PostgreSQL DDL schema
├── lib/
│   ├── auth/                  # Neon Auth client & server session verification
│   ├── db.ts                  # Neon Serverless SQL connection pool
│   ├── format.ts              # Relative dates, number abbreviations, bytes
│   ├── github.ts              # GraphQL & REST queries for GitHub API
│   ├── langColors.ts          # GitHub language color mappings
│   ├── sync.ts                # Resumable sync orchestrator
│   └── types.ts               # Core TypeScript data contracts
├── public/                    # Static assets
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore file
├── next.config.ts             # Next.js configuration
├── package.json               # Node.js dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── vercel.json                # Vercel cron and function timeouts configuration
```

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory for local execution:

```env
# Neon Postgres pooled connection string
DATABASE_URL="postgres://user:password@ep-xyz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Neon Auth (Managed Better Auth) base URL
NEON_AUTH_BASE_URL="https://<project-ref>.neon.tech"

# Cookie encryption secret for sessions (min 32 random characters)
NEON_AUTH_COOKIE_SECRET="generate-with-openssl-rand-hex-32"

# Secret guarding /api/cron/sync (must match Vercel Cron header)
CRON_SECRET="generate-with-openssl-rand-hex-32"
```

> **Note:** Never commit `.env` or `.env.local` to version control. An example template is provided in `.env.example`.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **npm** or **pnpm**
- **Neon Account**: Free serverless Postgres database
- **GitHub Account & OAuth App**

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/girishlade111/github-dashboard-app.git
   cd github-dashboard-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env.local
   # Fill in DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, and CRON_SECRET
   ```

### Running Migrations

Apply the database schema to your Neon Postgres database:

```bash
npm run db:migrate
```

*(The migration runner is idempotent and safe to re-run anytime schema changes occur.)*

### Development Server

Start the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚡ Sync Engine & Background Jobs

The sync engine synchronizes 800+ repositories, contribution records, packages, and pages:

- **GraphQL Pagination:** Queries `viewer.repositories(first: 100, after: $cursor)` in chunks.
- **Cursor Persistence:** The current pagination state is stored in the `sync_state` table. If a serverless function approaches the execution timeout, it halts cleanly and resumes on the next invocation.
- **Upsert Guarantees:** All queries use `ON CONFLICT (...) DO UPDATE` ensuring idempotent execution without duplicating records.
- **Manual Trigger:** Initiated via the "Sync now" button in the navigation bar (`POST /api/sync/trigger`).
- **Scheduled Cron:** Vercel Cron invokes `/api/cron/sync` daily at 06:00 UTC using the bearer token configured in `CRON_SECRET`.

---

## 🚢 Deployment Guide (Neon + Vercel)

### 1. Neon Database & Auth Setup
1. Create a project on [Neon](https://neon.tech) (e.g. in AWS Singapore `ap-southeast-1`).
2. Go to **Auth** in the Neon console and enable **Managed Better Auth**.
3. Under **Auth → Configuration**, copy your **Auth URL** (`NEON_AUTH_BASE_URL`).
4. Under **Dashboard → Connection Details**, select **Pooled connection** and copy `DATABASE_URL`.

### 2. GitHub OAuth App Setup
1. Go to **GitHub Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Homepage URL** to your Vercel deployment domain (e.g., `https://your-dashboard.vercel.app`).
3. Set **Authorization callback URL** to:
   ```
   https://<your-neon-auth-ref>.neon.tech/callback/github
   ```
4. Copy the generated **Client ID** and **Client Secret**.
5. Return to Neon Console → **Auth → Providers → GitHub**, supply the keys, and request the `read:user repo` scopes.

### 3. Vercel Deployment
1. Import the repository into [Vercel](https://vercel.com).
2. Add the four required environment variables:
   - `DATABASE_URL`
   - `NEON_AUTH_BASE_URL`
   - `NEON_AUTH_COOKIE_SECRET`
   - `CRON_SECRET`
3. Click **Deploy**. Vercel will automatically discover the scheduled cron defined in `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/sync",
         "schedule": "0 6 * * *"
       }
     ]
   }
   ```

---

## 🛡 Security & Access Control

- **Single-User Allowlist:** Enforced at the middleware and API layer. Only GitHub user `girishlade111` is permitted. Any other authenticated GitHub account is redirected to `/denied`.
- **Zero Token Leaks:** The GitHub OAuth token is stored encrypted in Neon Auth's `account` table and accessed server-side only. It is never transmitted to the browser client.
- **Protected Cron Endpoint:** The `/api/cron/sync` handler strictly validates the incoming `Authorization: Bearer <CRON_SECRET>` header.
- **No Direct GitHub Render Dependency:** Eliminates third-party downtime and rate-limiting issues on page views.

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts the Next.js development server at `http://localhost:3000` |
| `npm run build` | Compiles the production application bundle with TypeScript checks |
| `npm run start` | Launches the production build locally |
| `npm run lint` | Runs ESLint to check for code quality and syntax issues |
| `npm run db:migrate` | Runs `tsx db/migrate.ts` to execute idempotent database migrations |

---

## 👤 Author

**Girish Lade**
- GitHub: [@girishlade111](https://github.com/girishlade111)
