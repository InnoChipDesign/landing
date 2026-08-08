# Architecture

## 1. Stack

Versions verified against the npm registry on 2026-08-07.

| Concern | Choice | Version |
|---|---|---|
| Runtime | Node.js | 24 LTS |
| Package manager | pnpm | 10.x |
| Framework | `astro` | 7.2.0 |
| Language | TypeScript, `strict` | 5.x |
| Styling | `tailwindcss` (v4, Vite plugin) | 4.3.3 |
| Islands | `@astrojs/preact` + `preact` | 6.0.2 / 10.29.8 |
| Island state | `@preact/signals` | 2.11.0 |
| Markdown | `@astrojs/mdx` | 7.0.5 |
| Sitemap | `@astrojs/sitemap` | 3.7.3 |
| Search | `pagefind` (devDependency) | 1.5.2 |
| Images | `sharp` (Astro's default image service) | 0.35.3 |
| Icons | `astro-icon` + Iconify sets (offline JSON) | 1.1.5 |
| OG images | `satori` + `@resvg/resvg-js` | 0.29.0 / 2.6.2 |
| Fonts | Astro Fonts API, `local` provider | built-in |

**Not used:** React, Fuse.js, any analytics SDK, any CMS, any hosting-provider SDK, any CDN at runtime.

### Notes on specific choices

- **Preact, not React** (D11). Same JSX component model, ~4 KB gzipped instead of ~45 KB. Configure
  `@astrojs/preact` with `compat: true` so `preact/compat` aliases `react`/`react-dom` — a snippet
  copied from a React tutorial still compiles, and no component has to be written differently.
  `@preact/signals` replaces `useState` for the explorer's filter state, which keeps the whole island
  re-render-free.
- **Tailwind v4** is installed as a Vite plugin (`@tailwindcss/vite`), *not* via the deprecated
  `@astrojs/tailwind` integration. Design tokens are declared with `@theme` in a single CSS file.
- **Fonts** use Astro's stable Fonts API with the **`local` provider** and font files committed under
  `src/assets/fonts/`. Not the `google` provider: the Docker build must not depend on reaching
  Google's servers, and self-hosted files keep the "no third-party binding" property. Astro emits the
  `@font-face` rules, preload hints and an optimized fallback metric-override for us.
- **Icons** are resolved at build time from locally installed Iconify JSON packages, so icons are
  inlined SVG with zero runtime requests.

## 2. URL layout — one build, two zones

Confirmed 2026-08-07 (D15/D19). The domain root is a **portal**; the club site lives under `/club`.

```
/                       portal — grid of the club's web properties, zero nav, zero JS
/club                   club home
/club/projects          directory
/club/projects/<slug>   project detail
/club/about  /club/events  /club/equipment  /club/resources  /club/join  /club/contact
/404
```

**No `base` config.** Astro's `base` would mount the *entire* site under `/club` and make `/`
unbuildable from this repo — but we own `/` too. The prefix is a real directory, `src/pages/club/`.

Consequences to hold on to during implementation:

| Concern | Rule |
|---|---|
| Internal links | Always root-absolute (`/club/projects`). Never relative, never `BASE_URL`. |
| Link construction | Build them through `href()` helpers in `src/lib/routes.ts` — never string-concatenate `'/club/' + …` in a component. One typo'd prefix is invisible until someone clicks it. |
| Pagefind glob | `--glob "club/projects/**/*.html"` (the `/club` segment is part of the on-disk path) |
| Sitemap | Includes both zones; `/404`, `/og/*` excluded |
| Header/footer | Rendered by `ClubLayout` only. The portal has neither. |

`src/lib/routes.ts` is small and worth having on day one:

```ts
export const routes = {
  portal: () => '/',
  club: () => '/club',
  projects: () => '/club/projects',
  project: (slug: string) => `/club/projects/${slug}`,
  about: () => '/club/about',
  events: () => '/club/events',
  equipment: () => '/club/equipment',
  resources: () => '/club/resources',
  join: () => '/club/join',
  contact: () => '/club/contact',
  og: (slug: string) => `/og/${slug}.png`,
  original: (slug: string, file: string) => `/originals/${slug}/${file}`,
} as const;
```

If the club is ever moved to the domain root, or to a different prefix, this file is the only edit.

## 3. Repository layout

```
.
├── Dockerfile
├── docker-compose.yml
├── Caddyfile
├── astro.config.mjs
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── planning/                     # these documents
├── templates/project/            # scaffold students copy
├── public/
│   ├── favicon.ico  favicon.svg  apple-touch-icon.png
│   └── site.webmanifest
└── src/
    ├── assets/
    │   ├── fonts/                # committed woff2 files
    │   ├── images/               # hero, map-innopolis.png, og-default, cover-stub
    │   └── logo.svg
    ├── components/
    │   ├── ui/                   # Button, Card, Badge, Chip, Prose, Section…
    │   ├── layout/               # Header, Footer, Nav, Container, ThemeToggle
    │   ├── project/              # ProjectRow, ProjectCard, ProjectMeta, TeamCredits…
    │   ├── media/                # Figure, Gallery, VideoFacade
    │   ├── portal/               # PortalCard, PortalGrid
    │   └── islands/              # Preact — ProjectExplorer, Lightbox
    ├── content/
    │   ├── projects/<slug>/index.mdx + images
    │   ├── events/<slug>.mdx
    │   └── pages/                # long-form copy for about, join, resources
    ├── data/
    │   ├── site.ts               # club facts — see 11-club-data.md §10
    │   ├── people.yaml
    │   ├── tags.yaml
    │   ├── services.yaml
    │   ├── equipment.yaml
    │   └── resources.yaml
    ├── layouts/
    │   ├── BaseLayout.astro      # <head>, tokens, theme script — used by BOTH zones
    │   ├── PortalLayout.astro    # no nav, no footer nav
    │   ├── ClubLayout.astro      # header + footer + skip link
    │   └── ProjectLayout.astro
    ├── lib/
    │   ├── routes.ts             # the only place URLs are constructed
    │   ├── video.ts              # provider parsing → embed URL + poster
    │   ├── search.ts             # Pagefind client wrapper
    │   ├── url-state.ts          # query-param ⇄ filter state
    │   ├── seo.ts                # meta + JSON-LD builders
    │   ├── validate.ts           # build-time content assertions
    │   └── format.ts             # dates, file sizes
    ├── pages/
    │   ├── index.astro                  # PORTAL
    │   ├── club/index.astro
    │   ├── club/projects/index.astro
    │   ├── club/projects/[slug].astro
    │   ├── club/about.astro  events.astro  equipment.astro
    │   ├── club/resources.astro  join.astro  contact.astro
    │   ├── 404.astro
    │   └── og/[slug].png.ts             # generated OG images
    ├── integrations/
    │   └── copy-originals.ts     # local Astro integration, see 04-media.md
    ├── styles/
    │   └── global.css            # @theme tokens + base layer
    └── content.config.ts
```

**Rule:** anything a non-developer edits lives in `src/content/` or `src/data/`. Nothing under
`src/components/`, `src/lib/` or `src/pages/` should need to change to add a project, member, event,
service or resource link.

## 4. Rendering model

Three tiers, in order of preference:

1. **Static Astro component** — default. Ships zero JavaScript. Use for everything that is not
   interactive: rows, cards, sections, headers, project bodies, tables, footers, the whole portal.
2. **Astro component + a few lines of inline `<script>`** — trivial behaviour with no shared state:
   theme toggle, mobile menu, "copy link", and the **video facade** (one click handler that swaps a
   poster for an iframe). Still no framework.
3. **Preact island** — only where genuine client state exists.

There are exactly **two** islands. Adding a third requires justification in a PR:

| Island | Route(s) | Hydration | Approx. size |
|---|---|---|---|
| `ProjectExplorer` | `/club/projects` | `client:load` | ~14 KB app + ~4 KB Preact |
| `Lightbox` | `/club/projects/<slug>` | `client:visible` | ~3 KB app + ~4 KB Preact |

### Framework JS by route

- `/`, `/club`, `/club/about`, `/club/events`, `/club/equipment`, `/club/resources`, `/club/join`,
  `/club/contact`, `/404` → **0 KB of framework JS** (9 of 11 routes)
- `/club/projects` → Preact + ProjectExplorer + Pagefind chunks (loaded on demand)
- `/club/projects/<slug>` → Preact + Lightbox, hydrated only when the gallery scrolls into view; a
  project with no gallery loads nothing

`MobileNav` is deliberately **not** an island — it is an Astro component with a ~40-line inline
script around a native `<dialog>`. Making it an island would drag the framework onto every page for a
menu toggle. Same reasoning for the video facade.

### `ProjectExplorer` must degrade without JavaScript

`/club/projects` renders the **complete project list server-side**, newest-first, inside the island's
slot. With JS disabled the visitor still sees every project and can navigate to any of them; only the
search box and filter chips are inert (rendered `disabled` and hidden behind a `.js-only` class that
a tiny inline script un-hides). This is a hard requirement, not a nicety — it is also what makes the
page indexable by search engines, and with pagination now dropped (D22) the server-rendered list is
genuinely complete rather than a first page.

## 5. Build pipeline

```
pnpm build
 ├─ 1. astro check                                   → type + frontmatter errors fail fast
 ├─ 2. astro build
 │    ├─ content collections parsed + Zod-validated  → fails on bad frontmatter
 │    ├─ src/lib/validate.ts assertions              → tags, header-service cap, video URLs
 │    ├─ MDX → HTML
 │    ├─ sharp: responsive AVIF/WebP variants        → dist/_astro/
 │    ├─ satori + resvg: /og/<slug>.png              → dist/og/
 │    ├─ @astrojs/sitemap                            → dist/sitemap-index.xml
 │    └─ integration `copy-originals`                → dist/originals/<slug>/…
 └─ 3. pagefind --site dist --glob "club/projects/**/*.html"   → dist/pagefind/*
```

`package.json` scripts:

```jsonc
{
  "dev":        "astro dev",
  "build":      "astro check && astro build && pnpm index",
  "index":      "pagefind --site dist --glob \"club/projects/**/*.html\"",
  "preview":    "astro preview",
  "search:dev": "pnpm build && cp -r dist/pagefind public/pagefind",
  "check":      "astro check && tsc --noEmit",
  "test":       "vitest run"
}
```

### The dev-mode search gap

Pagefind runs against `dist/`, which does not exist under `astro dev`. Two mitigations, both
documented for contributors:

1. `pnpm search:dev` builds once and copies `dist/pagefind/` into `public/pagefind/` (git-ignored) so
   the dev server serves real search results against a snapshot of the content.
2. `src/lib/search.ts` detects a missing `/pagefind/pagefind.js` and puts the explorer into a
   **degraded mode**: filters still work (they run against the server-rendered data attributes), only
   the free-text query is disabled, with a visible dev-only notice. Nobody is blocked on search
   tooling to work on layout.

## 6. Configuration sketch

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import copyOriginals from './src/integrations/copy-originals';

export default defineConfig({
  // Required. The build fails loudly rather than defaulting — see 08-deployment.md §2.
  site: process.env.SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
  integrations: [
    mdx(),
    preact({ compat: true }),
    sitemap({ filter: (p) => !p.includes('/og/') && !p.endsWith('/404') }),
    icon(),
    copyOriginals(),
  ],
  vite: { plugins: [tailwindcss()] },
  image: { /* sharp defaults; see 04-media.md §A1 */ },
  fonts: [ /* local provider; see 06-design-system.md §2 */ ],
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } } },
});
```

`site` is read from an env var so the same source tree builds for `localhost` and for the real
domain. It must be correct at build time — canonical URLs, the sitemap, OG image URLs and JSON-LD all
derive from it. This is the single most common static-site deployment mistake; `08-deployment.md`
makes it an explicit build argument, and D30 flags that **which** domain is canonical is still open.

## 7. Quality gates

- `astro check` + `tsc --noEmit` — zero errors required.
- Zod schemas + `src/lib/validate.ts` — a malformed project fails the build rather than shipping a
  broken page. Every assertion message must name the offending file path.
- Unit tests (`vitest`) for `src/lib/video.ts` (one per provider), `src/lib/url-state.ts` (round-trip
  parse/serialize), and `src/lib/routes.ts`.
- Lighthouse targets: **Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO 100** on `/`,
  `/club` and `/club/projects/<slug>`. `/club/projects` is allowed Performance ≥ 90 because of the
  island.
- No console errors on any page; no layout shift from images or the video facade (explicit
  `width`/`height` and a reserved aspect-ratio box everywhere).
