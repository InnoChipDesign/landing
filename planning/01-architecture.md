# Architecture

## 1. Stack

Versions verified live on 2026-08-07.

| Concern | Choice | Version |
|---|---|---|
| Runtime | Node.js | 24 LTS |
| Package manager | pnpm | 10.x |
| Framework | `astro` | 7.2.0 |
| Language | TypeScript, `strict` | 5.x |
| Styling | `tailwindcss` (v4, Vite plugin) | 4.3.3 |
| Islands | `@astrojs/react` + `react`/`react-dom` | 6.0.2 / 19.2.8 |
| Markdown | `@astrojs/mdx` | 7.0.5 |
| Sitemap | `@astrojs/sitemap` | 3.7.3 |
| Search | `pagefind` (devDependency) | 1.5.2 |
| Images | `sharp` (Astro's default image service) | 0.35.3 |
| Icons | `astro-icon` + Iconify sets (offline JSON) | 1.1.5 |
| OG images | `satori` + `@resvg/resvg-js` | 0.29.0 / 2.6.2 |
| Fonts | Astro Fonts API, `local` provider | built-in |

**Not used:** Fuse.js, any analytics SDK, any CMS, any hosting-provider SDK, any CDN at runtime.

### Notes on specific choices

- **Tailwind v4** is installed as a Vite plugin (`@tailwindcss/vite`), *not* via the deprecated
  `@astrojs/tailwind` integration. Design tokens are declared with `@theme` in a single CSS file.
- **Fonts** use Astro's stable Fonts API with the **`local` provider** and font files committed under
  `src/assets/fonts/`. Not the `google` provider: the Docker build must not depend on reaching
  Google's servers, and self-hosted files keep the "no third-party binding" property. Astro emits the
  `@font-face` rules, preload hints and an optimized fallback metric-override for us.
- **Icons** are resolved at build time from locally installed Iconify JSON packages, so icons are
  inlined SVG with zero runtime requests.

## 2. Repository layout

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
├── public/
│   ├── favicon.ico  favicon.svg  apple-touch-icon.png
│   ├── site.webmanifest
│   └── robots.txt
└── src/
    ├── assets/
    │   ├── fonts/                # committed woff2 files
    │   ├── images/               # site-level imagery (hero, about, og fallback)
    │   └── logo.svg
    ├── components/
    │   ├── ui/                   # Button, Card, Badge, Chip, Prose, Section…
    │   ├── layout/               # Header, Footer, Nav, Container, ThemeToggle
    │   ├── project/              # ProjectCard, ProjectMeta, TeamCredits, LinksBox
    │   ├── media/                # Figure, Gallery, VideoEmbed
    │   └── islands/              # React — ProjectExplorer, Lightbox, MobileNav
    ├── content/
    │   ├── projects/<slug>/index.mdx + images
    │   ├── events/<slug>.mdx
    │   └── pages/                # long-form copy for /about, /join, /resources
    ├── data/
    │   ├── people.yaml
    │   ├── services.yaml
    │   ├── resources.yaml
    │   └── site.ts               # club name, URLs, nav, social, form links
    ├── layouts/
    │   ├── BaseLayout.astro
    │   ├── PageLayout.astro
    │   └── ProjectLayout.astro
    ├── lib/
    │   ├── video.ts              # provider parsing → embed URL
    │   ├── search.ts             # Pagefind client wrapper
    │   ├── url-state.ts          # query-param ⇄ filter state
    │   ├── seo.ts                # meta + JSON-LD builders
    │   └── format.ts             # dates, file sizes
    ├── pages/
    │   ├── index.astro
    │   ├── projects/index.astro
    │   ├── projects/[slug].astro
    │   ├── about.astro  events.astro  resources.astro  join.astro  contact.astro
    │   ├── 404.astro
    │   └── og/[slug].png.ts      # generated OG images
    ├── integrations/
    │   └── copy-originals.ts     # local Astro integration, see 04-media.md
    ├── styles/
    │   └── global.css            # @theme tokens + base layer
    └── content.config.ts         # collection definitions
```

**Rule:** anything a non-developer edits lives in `src/content/` or `src/data/`. Nothing under
`src/components/`, `src/lib/` or `src/pages/` should need to change to add a project, member, event
or resource link.

## 3. Rendering model

Three tiers, in order of preference:

1. **Static Astro component** — default. Ships zero JavaScript. Use for everything that is not
   interactive: cards, sections, headers, project bodies, tables, footers.
2. **Astro component + a few lines of inline `<script>`** — for trivial behaviour with no state to
   share (theme toggle, "copy link" button). Still no framework.
3. **React island** — only where genuine client state exists.

There are exactly **three** React islands. Adding a fourth requires justification in a PR:

| Island | Route(s) | Hydration | Approx. size |
|---|---|---|---|
| `ProjectExplorer` | `/projects` | `client:load` | ~14KB app + React runtime |
| `Lightbox` | `/projects/<slug>` | `client:visible` | ~3KB app + React runtime |
| `MobileNav` | all | `client:media="(max-width: 1023px)"` | ~1KB app + React runtime |

### Keeping React off pages that don't need it

`MobileNav` would otherwise pull the React runtime onto every page including the homepage. To avoid
that, **`MobileNav` is not a React island** — it is an Astro component with a ~40-line inline script
(a `<dialog>` plus a class toggle). Only `/projects` and `/projects/<slug>` load React.

Result:
- `/`, `/about`, `/events`, `/resources`, `/join`, `/contact` → **0 KB of framework JS**
- `/projects` → React + ProjectExplorer + Pagefind chunks (loaded on demand)
- `/projects/<slug>` → React + Lightbox, hydrated only when the gallery scrolls into view

### `ProjectExplorer` must degrade without JavaScript

`/projects` renders the **complete project grid server-side**, sorted newest-first, inside the
island's slot. With JS disabled the visitor still sees every project and can navigate to any of them;
only the search box and filter chips are inert (they are rendered `disabled` and hidden via a
`.js-only` class that a tiny inline script un-hides). This is a hard requirement, not a nicety — it
is also what makes the page indexable by Pagefind and by search engines.

## 4. Build pipeline

```
pnpm build
 ├─ 1. astro build
 │    ├─ content collections parsed + Zod-validated  → fails the build on bad frontmatter
 │    ├─ MDX → HTML
 │    ├─ sharp: responsive AVIF/WebP variants        → dist/_astro/
 │    ├─ satori + resvg: /og/<slug>.png              → dist/og/
 │    ├─ @astrojs/sitemap                            → dist/sitemap-index.xml
 │    └─ integration `copy-originals`                → dist/originals/<slug>/…
 └─ 2. pagefind --site dist                          → dist/pagefind/*
```

`package.json` scripts:

```jsonc
{
  "dev":        "astro dev",
  "build":      "astro check && astro build && pagefind --site dist",
  "preview":    "astro preview",
  "search:dev": "astro build && pagefind --site dist && cp -r dist/pagefind public/pagefind",
  "check":      "astro check && tsc --noEmit"
}
```

`astro check` runs **before** the build so a type or frontmatter error fails fast.

### The dev-mode search gap

Pagefind runs against `dist/`, which does not exist under `astro dev`. Two mitigations, both documented
for contributors:

1. `pnpm search:dev` builds once and copies `dist/pagefind/` into `public/pagefind/`
   (git-ignored) so the dev server can serve real search results against a snapshot of the content.
2. `src/lib/search.ts` detects a missing `/pagefind/pagefind.js` and puts the explorer into a
   **degraded mode**: filters still work (they run against the server-rendered data attributes),
   only the free-text query is disabled, with a visible dev-only notice. Nobody is blocked on search
   tooling to work on layout.

## 5. Configuration sketch

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import copyOriginals from './src/integrations/copy-originals';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://club.example.edu',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
  integrations: [mdx(), react(), sitemap(), icon(), copyOriginals()],
  vite: { plugins: [tailwindcss()] },
  image: { /* sharp defaults; see 04-media.md */ },
  fonts: [ /* local provider; see 06-design-system.md */ ],
  markdown: { shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } } },
});
```

`site` is read from an env var so the same source tree builds for `localhost` and for the real
domain. It must be correct at build time — canonical URLs, the sitemap, OG image URLs and JSON-LD all
derive from it. This is the single most common static-site deployment mistake; `08-deployment.md`
makes it an explicit build argument.

## 6. Quality gates

- `astro check` + `tsc --noEmit` — zero errors required.
- Zod schemas — a malformed project fails the build rather than shipping a broken page.
- Lighthouse targets: **Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO 100** on `/`
  and `/projects/<slug>`. `/projects` is allowed Performance ≥ 90 because of the React island.
- No console errors on any page; no layout shift from images (explicit `width`/`height` everywhere).
