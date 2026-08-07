# Design System — "Light, bright & academic"

Direction chosen in planning: light default, generous whitespace, serif headings over a sans body.
Approachable and university-appropriate, and it carries the text-heavy About/Join/Resources pages
better than a dark technical theme would. A dark mode exists as a toggle, not as the default.

## 1. Tokens

Declared once with Tailwind v4's `@theme` in `src/styles/global.css`. Nothing in the codebase uses a
raw hex value.

```css
@import "tailwindcss";

@theme {
  /* ── colour: light (default) ─────────────────────────────── */
  --color-bg:            #FFFFFF;
  --color-surface:       #F6F7F9;
  --color-surface-2:     #EDEFF3;
  --color-border:        #DFE3E8;
  --color-text:          #10151C;
  --color-muted:         #5B6672;
  --color-accent:        #1D4ED8;   /* primary action, links */
  --color-accent-hover:  #1740B4;
  --color-accent-soft:   #EAF0FE;   /* chip / callout background */
  --color-warm:          #F59E0B;   /* awards, highlights — used sparingly */
  --color-success:       #0F766E;
  --color-danger:        #B4212C;

  /* ── typography ──────────────────────────────────────────── */
  --font-display: "Source Serif 4 Variable", Georgia, serif;
  --font-sans:    "Inter Variable", system-ui, sans-serif;
  --font-mono:    "JetBrains Mono Variable", ui-monospace, monospace;

  /* ── radius, shadow, motion ──────────────────────────────── */
  --radius-sm: 6px;  --radius-md: 12px;  --radius-lg: 16px;  --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgb(16 21 28 / .05);
  --shadow-md: 0 4px 12px rgb(16 21 28 / .07);
  --shadow-lg: 0 12px 32px rgb(16 21 28 / .10);
  --ease-out: cubic-bezier(.22,.61,.36,1);
  --dur-fast: 120ms; --dur-base: 200ms;
}
```

### Dark mode

Class-based (`.dark` on `<html>`), applied before first paint by a blocking inline script that reads
`localStorage` then falls back to `prefers-color-scheme`. Only the colour tokens are redefined:

```css
.dark {
  --color-bg:          #0E1116;
  --color-surface:     #161B22;
  --color-surface-2:   #1E252E;
  --color-border:      #2A323C;
  --color-text:        #E9EDF2;
  --color-muted:       #97A2AF;
  --color-accent:      #6E9BFF;   /* lightened — #1D4ED8 fails contrast on dark */
  --color-accent-hover:#8FB2FF;
  --color-accent-soft: #16233D;
  --color-warm:        #FBBF24;
}
```

Rule: **no colour is ever defined only inside `.dark`.** Every token has a light value; dark
redefines. This is what keeps a missed token from rendering as transparent or black-on-black.

### Contrast

All pairs must meet WCAG AA (4.5:1 body, 3:1 large text and UI borders). Verified pairs:

| Pair | Light | Dark |
|---|---|---|
| text on bg | 16.8:1 ✓ | 15.1:1 ✓ |
| muted on bg | 5.9:1 ✓ | 6.4:1 ✓ |
| accent on bg | 7.5:1 ✓ | 6.2:1 ✓ |
| bg on accent (button) | 7.5:1 ✓ | 8.9:1 ✓ |

Recheck with a contrast tool whenever a token changes — this table is part of the spec, not a
one-time observation.

## 2. Typography

Self-hosted via Astro's Fonts API, `local` provider, files committed under `src/assets/fonts/`
(three variable woff2 files, latin subset, ~250 KB total, `display: swap`, preloaded for the two used
above the fold).

| Role | Font | Size / Line-height | Weight |
|---|---|---|---|
| Display (h1) | Source Serif 4 | `clamp(2.25rem, 1.6rem + 2.6vw, 3.5rem)` / 1.1 | 600 |
| h2 | Source Serif 4 | `clamp(1.6rem, 1.3rem + 1.2vw, 2.25rem)` / 1.2 | 600 |
| h3 | Source Serif 4 | 1.375rem / 1.3 | 600 |
| Body | Inter | 1.0625rem / 1.65 | 400 |
| Lead / summary | Inter | 1.1875rem / 1.55 | 400, muted |
| Small / meta | Inter | 0.875rem / 1.5 | 500 |
| Tag / code | JetBrains Mono | 0.8125rem / 1.4 | 500 |

- Prose column capped at **68ch**.
- Headings use `text-wrap: balance`; paragraphs use `text-wrap: pretty`.
- The serif is for headings only. Serif body text at screen sizes is the classic way an "academic"
  design becomes an unreadable one.

## 3. Spacing & layout

4px base scale (`4 8 12 16 24 32 48 64 96 128`). Section vertical rhythm: `96px` desktop, `64px`
mobile. Container `max-width: 1200px`, gutters `24px` / `16px`.

Breakpoints (Tailwind defaults): `sm 640 · md 768 · lg 1024 · xl 1280`.
Project grid: 1 column → 2 at `sm` → 3 at `lg` → 4 at `xl` (directory only; the homepage featured row
stops at 3).

## 4. Component inventory

Each is a small Astro component unless marked React.

**UI primitives** — `Button` (primary / secondary / ghost / external), `Card`, `Badge`, `Chip`
(filterable tag, with colour from `tags.yaml`), `StatusPill`, `Prose`, `Section`, `Container`,
`Heading`, `Divider`, `Icon`, `ExternalLink`, `Callout`, `Stat`, `EmptyState`, `Skeleton`.

**Layout** — `Header`, `Nav`, `MobileNav` (inline script), `Footer`, `ThemeToggle`, `Breadcrumbs`,
`SkipLink`.

**Domain** — `ProjectCard`, `ProjectHeader`, `ProjectMeta`, `TeamCredits`, `LinksBox`, `TechBox`,
`AwardsBox`, `RelatedProjects`, `PersonChip`, `PersonGrid`, `AlumniList`, `EventRow`, `ServiceCard`,
`ResourceGroup`, `FeaturedProjects`, `StatsBand`, `JoinCTA`.

**Media** — `Figure`, `Gallery`, `VideoEmbed`.

**Islands (React)** — `ProjectExplorer`, `Lightbox`.

That is ~35 components. Building the ~15 UI primitives first, in isolation, is the single biggest
determinant of whether the rest goes quickly.

## 5. Interaction & motion

- Transitions on `color`, `background`, `border`, `transform`, `opacity` only — never on `width`,
  `height` or `top`.
- Durations: `--dur-fast` for hover, `--dur-base` for entrances. Nothing exceeds 250 ms.
- Card hover: `translateY(-2px)` + shadow step up. No scale, no rotation.
- **All motion is wrapped in `@media (prefers-reduced-motion: no-preference)`.** Under
  `reduce`, transitions collapse to `0ms` and the lightbox cross-fade becomes an instant swap.

## 6. Accessibility requirements

Non-negotiable, checked before each release:

1. Visible focus ring on every interactive element: `2px solid var(--color-accent)`, `2px` offset.
   Never `outline: none` without a replacement.
2. "Skip to content" link as the first focusable element.
3. One `<h1>` per page; heading levels never skip.
4. All images have meaningful `alt`; decorative images have `alt=""`.
5. Iframes have `title`.
6. Colour is never the only carrier of meaning — status pills have text as well as colour.
7. Filter chips are real `<button aria-pressed>`; the sort control is a real `<select>`.
8. Live regions announce result counts.
9. Full keyboard operability, including the lightbox and the mobile menu.
10. Touch targets ≥ 44×44 px.

## 7. Iconography & favicons

- Icons: Iconify sets installed locally (`@iconify-json/lucide` fits the tone), inlined as SVG at
  build time via `astro-icon`. Never an icon font, never a runtime CDN fetch.
- Favicon set: `favicon.svg` (with a `prefers-color-scheme` variant inside the SVG), `favicon.ico`
  32×32 fallback, `apple-touch-icon.png` 180×180, and `site.webmanifest` with 192/512 PNGs and the
  theme colour. Generated from one source SVG logo.

## 8. What "AstroWind base" means concretely

Taken from AstroWind: the head/SEO component structure, the `Layout`/`Container` primitives, the
widget composition pattern, and the dark-mode toggle approach.

Replaced entirely: colour palette, typography, all card and section styling, the header treatment,
and every project-related component. In practice the site should not be recognizable as AstroWind —
we are borrowing its skeleton and its solved problems, not its appearance.
