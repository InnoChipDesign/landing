# Decision Log

Status: **agreed** unless marked otherwise. Every decision below was made explicitly by the club leader
during the planning session. This file is the source of truth — if another document contradicts it,
this file wins.

Date: 2026-08-07

---

## D1 — Framework: Astro 7, static output

`output: 'static'`. No SSR adapter, no server runtime. The build produces a `dist/` folder of
plain HTML/CSS/JS that any file server can host.

## D2 — Theme: AstroWind as visual/structural base

MIT-licensed, Tailwind-based, the most-forked Astro theme. We take its layout primitives, SEO head
handling and widget blocks, then replace the palette and typography with our own tokens (see
`06-design-system.md`). We do **not** vendor the whole theme wholesale — we lift the pieces we use.

> Risk accepted: AstroWind's look is recognizable. Mitigated by a distinct palette, type pairing and
> our own project-card / filter components, which are the pages visitors spend the most time on.

## D3 — Language: English only

**Reverses an earlier bilingual/quad-lingual direction.** No i18n routing, no locale prefixes, no
translation fallback logic, no RTL. `<html lang="en" dir="ltr">`.

> Consequence: this removes an estimated 30–40% of the total build effort. If a second language is
> ever needed, `05-sitemap-and-pages.md` §"Future i18n" notes the three places that would have to change.

## D4 — Content model: MDX per project via Content Collections

One folder per project under `src/content/projects/<slug>/`, containing `index.mdx` plus its images.
Zod-validated frontmatter. Type-safe, git-reviewable, no CMS service to operate.

## D5 — Project detail: dedicated prerendered page per project

`/projects/<slug>` is a real static HTML document. Required for SEO, for shareable links, for
per-project OG images, and it is what Pagefind indexes.

## D6 — Search: Pagefind, no Fuse.js

**Reverses the original "use Fuse.js, keep a migration path to Pagefind" requirement.** Going
straight to Pagefind avoids building the same feature twice, and Pagefind ships chunked indexes that
are fetched on demand rather than a single JSON blob every visitor downloads.

Consequences, accepted:
- Pagefind indexes **built HTML**, so anything that must be searchable has to be rendered into the page
  (visibly or via `data-pagefind-*` attributes). See `03-search-and-filtering.md`.
- Pagefind artifacts do not exist during `astro dev`. A documented dev workflow covers this.

## D7 — Facets: tags, year/semester, status, team member

Four filter dimensions plus a free-text query, all synced to the URL query string.

## D8 — People: `people.yaml` data collection, **no person pages**

Members and alumni live in one YAML file. They appear as credit chips on project pages and in the
homepage team/alumni grid. No `/team/<slug>` routes are generated. The `?team=` facet uses the
person `id`.

## D9 — Images: optimized variants inline, original behind an explicit download link

Originals are committed to the repo alongside the project. The build emits AVIF/WebP responsive
variants for the page, a ~2000px "large" variant for the lightbox, and copies the untouched original
into `dist/originals/` so the lightbox can offer **"View original (12 MB)"** with the size stated.

## D10 — Video: direct iframes, one provider at a time

All videos on the site come from a single provider, but **which** provider may change (YouTube,
Rutube, VK Video, Dzen). Therefore: no multi-provider facade UI, but a small parser/adapter layer so
switching providers is a content change, not a code change. Iframes are `loading="lazy"`.

## D11 — Islands: React via `@astrojs/react`

Chosen for contributor familiarity over payload size. Only three islands exist; everything else is
zero-JS Astro components.

> Trade-off accepted: ~45KB gzipped of React runtime on pages that carry an island. Mitigation in
> `01-architecture.md` §Islands keeps React off the pages that don't need it.

## D12 — SEO: core meta + generated OG images + JSON-LD

Sitemap, robots, canonical, Open Graph/Twitter, a build-time 1200×630 OG image per project, and
Schema.org JSON-LD (`Organization`, `CreativeWork`, `VideoObject`, `Person`, `Event`).
**No RSS feed** (not selected).

## D13 — Analytics: none

No tracking scripts, no cookies, no consent banner. Visit counts, if ever wanted, come from the web
server's access log analyzed locally.

## D14 — Serving: Caddy in a multi-stage Docker build

**Reverses the original nginx requirement.** The site sits **behind an existing university reverse
proxy** that terminates TLS, so our container serves plain HTTP on an internal port — but the
`Caddyfile` is env-driven so the same image can also self-terminate TLS on a public domain without a
rebuild.

## D15 — Pages

| Route | Purpose |
|---|---|
| `/` | Home — showcase-first |
| `/projects` | Searchable, filterable directory |
| `/projects/<slug>` | Project detail |
| `/about` | Mission, history, faculty |
| `/events` | Simple reverse-chronological list |
| `/resources` | Learning links, guides, equipment **+ "Services built by us" section** |
| `/join` | How to join |
| `/contact` | Channels, location |
| `/404` | Not found |

No `/team`, no `/team/<slug>`, no `/news`, no `/services` page.

## D16 — Header carries two external service buttons

The two flagship club services (referred to as **VCD** and **HW** — real names pending, see
`10-open-questions.md`) are external-link buttons in the top bar. The full list of club-built
services lives as a section on `/resources`.

## D17 — Homepage order

Showcase → mission → team & alumni → join CTA.

## D18 — Join flow: external form + chat

Primary CTA links to a hosted form (Google/Yandex Forms) for applications; secondary CTA is the
group chat / meeting time for questions. No backend, no self-hosted form service.

---

## Reversals summary

Three of the original requirements were deliberately overridden during planning. Recorded here so
nobody "fixes" them back later:

| Original requirement | Final decision | Reason |
|---|---|---|
| Use Fuse.js, allow migration to Pagefind | Pagefind only (D6) | Avoids building search twice; better index delivery |
| Deploy with nginx | Caddy (D14) | Simpler config, optional auto-TLS if it ever faces the internet |
| Multi-provider video embedding | Single provider, swappable (D10) | All videos come from one host at any given time |

An earlier answer selecting Russian/English/Chinese/Arabic was withdrawn in favour of English only (D3).
