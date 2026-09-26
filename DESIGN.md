# DESIGN.md — GitHub Personal Dashboard UI System

> Normative design spec. Based on the Claude.com (Anthropic) editorial language:
> warm cream canvas, coral primary, slab-serif display, dark navy product surfaces,
> minimal 1.5px line icons.

## 1. Principles

1. **Editorial, not SaaS.** The dashboard reads like a literary publication that
   happens to show data — serif headlines, generous whitespace, warm paper tones.
2. **Color-block pacing.** Pages alternate cream canvas → cream card → dark panel →
   cream → (rare) coral callout → dark footer. Never repeat a surface twice in a row.
3. **Scarce coral.** `#cc785c` appears on primary CTAs, the active nav item, and key
   data deltas — nowhere else.
4. **Data honesty.** Every number in JetBrains Mono; deltas always labeled with their
   basis ("vs last sync"); loading skeletons, never blank screens.

## 2. Color tokens

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#faf9f5` | Page floor |
| `surface-soft` | `#f5f0e8` | Section dividers |
| `surface-card` | `#efe9de` | Repo cards, stat cards, content cards |
| `surface-strong` | `#e8e0d2` | Active filter pills, emphasized bands |
| `primary` | `#cc785c` | Primary CTAs, active nav, key deltas |
| `primary-active` | `#a9583e` | Press/hover on primary |
| `accent-teal` | `#5db8a6` | Sync-ok dot, sparing |
| `accent-amber` | `#e8a55a` | Badges, inline highlights, sparing |
| `surface-dark` | `#181715` | Chart panels, heatmap, footer |
| `surface-dark-elevated` | `#252320` | Cards inside dark bands |
| `surface-dark-soft` | `#1f1e1b` | Inner code/stat blocks on dark |
| `hairline` | `#e6dfd8` | 1px borders on cream |
| `hairline-soft` | `#ebe6df` | Faint dividers |
| `ink` | `#141413` | Headlines, primary text |
| `body-strong` | `#252523` | Emphasized text |
| `body` | `#3d3d3a` | Running text |
| `muted` | `#6c6a64` | Secondary labels |
| `muted-soft` | `#8e8b82` | Captions, fine print |
| `on-primary` | `#ffffff` | Text on coral |
| `on-dark` | `#faf9f5` | Text on dark |
| `on-dark-soft` | `#a09d96` | Secondary text on dark |
| `success` | `#5db872` | Status ok |
| `warning` | `#d4a017` | Warnings |
| `error` | `#c64545` | Errors |

Language bars use GitHub's official per-language colors (not in this system).

## 3. Typography

- **Display:** `"Cormorant Garamond", "EB Garamond", Georgia, serif` — weights
  **400/500 only**, `letter-spacing: -0.02em`. Page titles, repo names, KPI numerals.
  **Never bold serif.**
- **Body/UI:** `"Inter", system-ui, sans-serif` — 400 paragraphs, 500 labels/buttons/nav.
- **Mono:** `"JetBrains Mono", ui-monospace, monospace` — stats, counts, timestamps, code.

| Token | Size / Weight / LH | Use |
|---|---|---|
| display-xl | 64 / 400 / 1.05 | Page h1 |
| display-lg | 48 / 400 / 1.1 | Section heads |
| display-md | 36 / 400 / 1.15 | Repo names, card titles |
| display-sm | 28 / 400 / 1.2 | Callout headlines |
| title-md | 18 / 500 / 1.4 | Stat card titles |
| body-md | 16 / 400 / 1.55 | Running text |
| body-sm | 14 / 400 / 1.55 | Secondary text |
| caption | 13 / 500 / 1.4 | Badges |
| caption-uppercase | 12 / 500 / 1.4 / +1.5px | Pills, tags |
| code | 14 / 400 / 1.6 | Mono blocks |
| button | 14 / 500 / 1.0 | Button labels |

## 4. Spacing & layout

- Base unit 4px. Section padding 96px; card padding 32px (24px dense data cards).
- Max content width 1200px centered. Repo grid: 3-up ≥1024px, 2-up 768–1024, 1-up <768.
- Sticky filter toolbar on `/repositories`.

## 5. Elevation & radius

- Elevation = color-block contrast. Shadows: none, except
  `0 1px 3px rgba(20,20,19,0.08)` on card hover. No gradients on surfaces.
- Radius: buttons/inputs 8px · cards 12px · hero containers 16px · pills 9999px ·
  avatars & icon buttons 50%.

## 6. Icons

Minimal **1.5px-stroke line icons** inspired by Lucide / Untitled UI / Radix Icons.
Set: home, layers, activity (pulse), star, git-fork, git-branch, git-commit,
bar-chart, package, file-text, book-open, search, settings, refresh-cw (sync),
plus, x, chevron-down, external-link, lock, globe, eye, bell, calendar, terminal.
Status indicators are **filled dots**, never icons. Never use filled/emojified glyphs.

## 7. Components

### 7.1 Top bar
Cream, 64px, hairline bottom border. Left: serif wordmark ("Ledger" + spike mark `✳`).
Center: nav (Overview, Repositories) — Inter 14/500, active = coral text + 2px coral
underline. Right: search trigger (⌘K hint), sync status (teal dot + "Synced {x} ago"
mono), "Sync now" primary button, avatar 36px circle.

### 7.2 Buttons
- **Primary:** coral bg, white text, 14/500, padding 12×20, height 40, radius 8.
  Active → `#a9583e`. Disabled → `#e6dfd8` bg.
- **Secondary:** canvas bg, ink text, 1px hairline border, same metrics.
- **On-dark:** `#252320` bg, `on-dark` text (never inverts).
- **Icon button:** 36px circle, canvas bg, hairline border, 1.5px line icon.

### 7.3 Repo card
`#efe9de` bg, 1px hairline border, 12px radius, 24px padding. Structure:
1. Row: serif repo name (display-md-ish 22px) + pill badges
   (Private/Public/Fork/Archived/Template — `caption-uppercase`).
2. Description, 2-line clamp, body-md.
3. Stats row: line icons + JetBrains Mono numerals — ★ stars, ⑂ forks, ● open issues.
4. GitHub stacked language bar (8px, rounded) + legend (dot + name + pct).
5. Topic pills (`surface-soft` bg, caption).
6. Meta rows (body-sm, muted): latest release tag · homepage link (external icon) ·
   Pages URL + status dot · packages (`package_type: name@version`).
7. Footer: `license · pushed {relative}` mono, muted-soft.
Whole card = link to repo URL (new tab). Hover: faint shadow only.

### 7.4 Stat card
Cream card, 12px radius, 24px padding. Small-caps muted label, serif numeral
(display-lg), delta line (mono, coral up / teal down / muted flat), tiny sparkline.

### 7.5 Dark data panel
`#181715` bg, 12px radius, 24px padding. Cream axis labels (mono 12px), hairline-soft
gridlines, coral primary series. Used for: star-growth chart, language donut,
contribution heatmap, terminal-style stat blocks.

### 7.6 Contribution heatmap
Dark panel. 53×7 grid, 12px squares, 3px gaps. Green scale
(`#1f1e1b` → `#5db872` steps). Cream month labels, "Less/More" legend.

### 7.7 Filter toolbar
Search input (canvas, hairline, 8px, 40px, coral focus ring), language `<select>`
(same), pills: inactive transparent/muted; active `surface-strong`/ink, 8px radius.
Sort select right-aligned. Live counts on pills (mono).

### 7.8 Activity row
Hairline-soft dividers, 1.5px icon, message (body-md), repo link (coral on hover),
mono relative timestamp right.

### 7.9 Badges
Pill: `surface-card` bg, ink, caption, 4×12 padding. Coral variant: coral bg, white,
`caption-uppercase` (NEW/BETA).

### 7.10 States
- Loading: cream skeleton blocks (pulse), never blank.
- Empty: one-line muted guidance ("No archived repos yet.").
- Error: hairline card, error-red title, retry secondary button.
- Sync failed: amber banner under top bar + "Reconnect GitHub" primary button.

### 7.11 Footer
Dark `#181715`, `on-dark-soft` text, 64px vertical padding, minimal link row +
"Private dashboard · data cached from GitHub" fine print.

## 8. Page specs

**`/` Overview:** profile header (avatar 80 circle, serif name 40px, @login mono muted,
bio, company/location line-icons, followers/following mono) → 4 stat cards →
heatmap dark panel → "Recently pushed" (8 rows, activity-row style).

**`/repositories`:** display-xl "Repositories" + subline → sticky filter toolbar →
result count (mono, muted) → card grid → empty state.

**`/login`:** centered cream card: serif headline, coral "Sign in with GitHub" primary
button (GitHub mark line icon), fine print "Private dashboard — authorized user only."

**`/denied`:** same shell, "Access denied" serif headline, muted explanation, sign-out
text button.

## 9. Responsive

- <768px: nav collapses to hamburger → full-screen cream sheet; grids 1-up;
  display-xl 64→36px; dark panels scroll horizontally, never wrap data.
- Touch targets ≥40px (icon buttons 36px centered, acceptable).

## 10. Accessibility

- Contrast: ink on cream AAA; coral buttons white-on-`#cc785c` AA (large text ok).
- Focus-visible: 3px coral-at-15% ring everywhere. Icon buttons get aria-labels.
- Heatmap cells get title tooltips + sr-only table fallback.
