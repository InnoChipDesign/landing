# Club Website — Planning & Specification

Design and specification documents for the student club landing site. Written 2026-08-07, before any
implementation. **No code has been written yet.**

## Read in this order

| # | Document | What it settles |
|---|---|---|
| 00 | [Decision Log](00-decisions.md) | Every agreed decision, incl. three reversals of the original brief. **Source of truth.** |
| 01 | [Architecture](01-architecture.md) | Stack and versions, repo layout, rendering model, build pipeline, quality gates |
| 02 | [Content Model](02-content-model.md) | Collection schemas, frontmatter, `people.yaml`, authoring rules |
| 03 | [Search & Filtering](03-search-and-filtering.md) | Pagefind indexing contract, facets, URL query-param sync |
| 04 | [Media](04-media.md) | Image pipeline, originals, lightbox, video provider adapter |
| 05 | [Site Map & Pages](05-sitemap-and-pages.md) | Routes, global chrome, per-page wireframes |
| 06 | [Design System](06-design-system.md) | Tokens, typography, components, motion, accessibility |
| 07 | [SEO & Performance](07-seo.md) | Metadata, generated OG images, JSON-LD, budgets |
| 08 | [Deployment](08-deployment.md) | Dockerfile, Caddyfile, compose, CSP, release checklist |
| 09 | [Implementation Plan](09-implementation-plan.md) | Nine phases, critical path, estimates, risks |
| 10 | [Open Questions](10-open-questions.md) | **Facts needed from the club leader** + decisions to veto |

## The site in one paragraph

A static, English-language Astro 7 site for a student engineering club. Nine routes: a showcase-first
homepage, a searchable and filterable project directory backed by Pagefind, a page per project with
demo video and image gallery, plus About, Events, Resources (including club-built services), Join and
Contact. Content is MDX and YAML in the repository — no CMS, no database, no backend. Three React
islands; six of the nine routes ship zero framework JavaScript. Built and served by a two-stage
Docker image (Node builds, Caddy serves), deployed with one command behind the university's reverse
proxy, with no dependency on GitHub or any hosting provider.

## Next step

Answer section A of [10-open-questions.md](10-open-questions.md) — club name, domain, and the two
header services. That unblocks Phase 1.
