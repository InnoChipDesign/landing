# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static Astro 7 site for the Innopolis Chip Design Club. No CMS, no database, no backend, no
hosting-provider binding. **One build serves two zones**: a portal at `/` and the club site under
`/club`. Content is MDX + YAML in the repo; the output is static HTML served by Caddy in a
two-stage Docker image.

`planning/` is the specification and is actively load-bearing — the code comments cite it
constantly (`D11`, `05 §6`, `03 §4`). When a change touches behaviour that has a decision behind
it, read the cited section first:

- `planning/00-decisions.md` — every decision D1–D32. **Source of truth for decisions.**
- `planning/11-club-data.md` — every club fact (names, domains, contacts). **Source of truth for facts.**
- The rest (`01`–`10`) cover architecture, content model, search, media, sitemap, design system,
  SEO, deployment, plan, open questions.

## Commands

```bash
pnpm install
pnpm dev                                    # http://localhost:4321
SITE_URL=http://localhost:4321 pnpm verify  # check + test + build + dist assertions — run before a PR
```

| Command | Notes |
|---|---|
| `pnpm check` | `astro check` + `tsc --noEmit` |
| `pnpm test` | `vitest run` |
| `pnpm exec vitest run src/lib/video.test.ts` | one test file (`-t "name"` for one case) |
| `pnpm build` | `astro check` → `astro build` → Pagefind index. **Requires `SITE_URL`.** |
| `pnpm check:dist` | post-build assertions against `dist/` (`scripts/check-dist.mjs`) |
| `pnpm search:dev` | build once and copy the Pagefind index into `public/` so search works in dev |
| `pnpm icons` | regenerate favicon/OG rasters from `src/assets/logo.svg` |

Node ≥ 24, pnpm 10 (pinned via `packageManager`).

### `SITE_URL`

Has **no production default** and `astro build` throws without it. Canonicals, the sitemap, OG image
URLs and JSON-LD are baked in at build time, so a wrong value ships wrong link previews and nothing
looks broken until someone shares a link. `dev`/`check`/`preview` fall back to localhost because
they emit nothing publishable. In Docker it is a build ARG, not a runtime setting.

### Search in dev

Pagefind indexes **built HTML**, so its index does not exist under `astro dev`. Use `pnpm search:dev`
(writes the git-ignored `public/pagefind/`).

## Architecture

### Two zones, one build

There is no Astro `base`. `/club` is a real directory under `src/pages/club/`. Three layouts:
`BaseLayout` (head, tokens, theme script, shared by both zones) → `PortalLayout` / `ClubLayout`
(chrome + JSON-LD). `ClubLayout` emits `Organization` on every club page; per-page schema is passed
in via its `schema` prop and must not repeat it.

### Content and data layer

`src/content.config.ts` defines everything. Content collections generate routes; data collections
never do:

- **content**: `projects` (`src/content/projects/<slug>/index.mdx`, folder name *is* the permanent
  slug), `events`, `pages` (long-form copy imported by fixed routes).
- **data**: `people`, `tags`, `services`, `equipment`, `resources` — all YAML in `src/data/`.

Zod guarantees shape. The cross-file rules it cannot see live in `src/lib/validate.ts`: tags must
exist in `tags.yaml`, video URLs must parse to an embeddable host, at most two services may be
`inHeader`, every team credit needs a `person` id or a `name`, no duplicate OG slugs. Because
`astro:content` is not importable from an integration hook, validation is triggered from
`BaseLayout` via `ensureContentValid()` (memoized, runs once per build) — that is why every route
passes through `BaseLayout`.

`draft: true` projects are filtered out in `src/lib/projects.ts`, the one place every caller goes
through, and excluded from `getStaticPaths`. That is a different axis from `status` (D23).

`src/data/site.ts` holds club facts, copied by hand from `planning/11-club-data.md`.

### The two islands (D11, Preact)

Exactly two: `ProjectExplorer.tsx` and `Lightbox.tsx`. **Neither renders content.** The complete
project list and the gallery thumbnails are server-rendered Astro; the islands filter, reorder and
enhance DOM that already works without them. Anything else interactive is an Astro component with a
short inline script (theme toggle, mobile menu, video facade). A third island needs justification in
the PR.

Nine of eleven routes ship 0 KB of framework JS. Budgets are in `README.md` and `planning/07-seo.md` §5.

### Search

`src/lib/search.ts` is the only module that knows Pagefind exists. It returns matching slugs in
relevance order and nothing else — the island reorders rows already in the DOM. Facet counts are
computed from the DOM, not from Pagefind's `filters`, so they survive a missing index. The URL
query-param contract (`?q=&tags=&year=&status=&sort=`) lives in `src/lib/url-state.ts` and has a
unit-tested round-trip invariant.

### Build-time integrations (`src/integrations/`)

- `copy-originals.ts` — copies committed project images byte-for-byte into `dist/originals/<slug>/`
  plus a manifest, so the lightbox can label "View original (JPEG, 11.4 MB)".
- `generate-csp.ts` — generates the CSP from the **built output**: sha256 of every inline script
  that actually shipped, and a `frame-src` of exactly the video hosts the published pages reference.
  Written to `csp.caddy` *beside* `dist/`, never inside it. Never edit the policy by hand. Ships as
  `Content-Security-Policy-Report-Only` until `CSP_HEADER` is set at runtime (D29).

OG cards are generated per project at `/og/<slug>.png` via satori + resvg (`src/lib/og.ts`; satori
needs static `.woff`, not the variable `.woff2` the browser gets).

### `pnpm check:dist`

Asserts against real build output the failures that are otherwise **silent**: the Pagefind index
exists; the Pagefind markup contract (`data-pagefind-body` plus the `tag[data-tags]`,
`year[data-year]`, `status[data-status]` filter declarations) is intact on every project page; the directory server-renders and links *every* project (the "island
swallowed the list" failure, visible only with JS off); every row has a thumbnail or a stub; the CSP
covers every inline script that shipped; and, for a real domain, that canonical/OG/sitemap/robots
URLs all carry it.

### Conditional routes

`/club/equipment` uses a rest-parameter route (`equipment/[...slug].astro`) whose `getStaticPaths`
returns `[]` while `equipment.yaml` is empty — a plain `.astro` file always emits. `src/lib/nav.ts`
drops the nav item on the same condition, so a live nav item can never point at a missing page (D31).

## House rules

- **All internal links go through `src/lib/routes.ts`.** Never concatenate `'/club/' + …`.
- **No raw hex colours.** Every colour is a token in `src/styles/global.css`, defined for light
  *and* dark. `--color-brand` (the club green) is brand-only — it fails WCAG AA on white, so never
  use it for a link, button or focus ring.
- **No project or equipment thumbnail outside `ProjectCover`** — it owns the cover-or-stub fallback (D21).
- **No club fact hardcoded in a component** — it belongs in `src/data/site.ts` or a content file.
- Every inline `<script>` changes the CSP; it regenerates itself, and `check:dist` catches an
  uncovered one.
- Tailwind v4 is wired as a **Vite plugin**, not the deprecated `@astrojs/tailwind` integration.
- `z` is imported from `astro/zod`, not from `astro:content` (deprecated in Astro 7).
- Icons resolve at build time from the installed `@iconify-json/lucide`; never an icon font or a
  runtime CDN fetch. Fonts are `fontProviders.local()` against installed `@fontsource*` packages, so
  a build never touches the network.

Zero third-party requests before interaction, on every route. The only one the site can make is a
video iframe after a click (D10) — which is why there is no cookie banner. Preserve that property.

## Authoring content

Full instructions in `CONTRIBUTING.md`. A malformed project **fails the build by design**, and every
message names the file. New project: copy `templates/project/` to `src/content/projects/<slug>/`,
put images in at original resolution (do not pre-resize), set `draft: false` when done.

## Deployment

`DEPLOY.md`. One container: Caddy serving static files behind the university's reverse proxy. No CI,
no registry, no hosting provider — deliberately. `docker compose up -d --build`; the only backup is
this git repository.

## Known open items

`README.md` §"Blocked on the club leader" lists eight — most importantly **D30, the canonical domain,
is unresolved**, and copy in `src/content/pages/` carrying `draftCopy: true` renders a visible warning
until approved. `planning/` is dated 2026-08-07/08 and says "no code has been written yet"; that is
stale — phases 0–7 are implemented.
