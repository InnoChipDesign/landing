# InnoChipDesign — Planning & Specification

Design and specification documents for the Innopolis Chip Design Club website.
Written 2026-08-07, revised 2026-08-08 with the club leader's answers. **No code has been written yet.**

## Read in this order

| # | Document | What it settles |
|---|---|---|
| 00 | [Decision Log](00-decisions.md) | Every agreed decision, D1–D32, plus the reversals table. **Source of truth for decisions.** |
| 11 | [Club Data Sheet](11-club-data.md) | Every club-specific fact — names, domains, contacts, partners — in copy-into-code form. **Source of truth for facts.** |
| 01 | [Architecture](01-architecture.md) | Stack and versions, URL layout, repo layout, rendering model, build pipeline, quality gates |
| 02 | [Content Model](02-content-model.md) | Collection schemas, frontmatter, tags, people, services, equipment, authoring rules |
| 03 | [Search & Filtering](03-search-and-filtering.md) | Pagefind indexing contract, three facets, URL query-param sync |
| 04 | [Media](04-media.md) | Image pipeline, cover stub, originals, lightbox, video facade, provider adapters |
| 05 | [Site Map & Pages](05-sitemap-and-pages.md) | Routes, global chrome, per-page wireframes, drafted copy |
| 06 | [Design System](06-design-system.md) | Tokens, typography, components, motion, accessibility |
| 07 | [SEO & Performance](07-seo.md) | Metadata, generated OG images, JSON-LD, budgets |
| 08 | [Deployment](08-deployment.md) | Dockerfile, Caddyfile, compose, CSP, release checklist |
| 09 | [Implementation Plan](09-implementation-plan.md) | Nine phases, critical path, estimates, blockers, risks |
| 10 | [Open Questions](10-open-questions.md) | **Answered.** Record of what each answer changed + what's still blocking |

Two rules that keep this set coherent:

- A **decision** goes in `00`. A **fact about the club** goes in `11`. Neither is duplicated
  elsewhere — other documents reference them.
- Anything marked 🟡 is copy I drafted for approval, not text the leader supplied. Anything marked 🔴
  is still missing.

## The site in one paragraph

A static, English-language Astro 7 site for Innopolis University's chip design club. The domain root
is a **portal** — three cards pointing at the club site and the club's two services, VCD and HW. The
club site itself lives under `/club`: a showcase-first home, a searchable and filterable project
directory backed by Pagefind and rendered as a row list, a page per project with a click-to-load demo
video and an image gallery, plus About, Events, Equipment, Resources, Join and Contact. Content is
MDX and YAML in the repository — no CMS, no database, no backend. Two Preact islands; **nine of
eleven routes ship zero framework JavaScript, and no route makes a third-party request until a
visitor clicks a play button.** Built and served by a two-stage Docker image (Node builds, Caddy
serves), deployed with one command behind the university's reverse proxy, with no dependency on
GitHub or any hosting provider.

## Status

**Phases 0–4 are unblocked** — foundations, content model, project pages and the directory. That is
more than half the build, and it can start now.

Six things are still needed from the club leader, listed with deadlines in
[10-open-questions.md](10-open-questions.md) §1. The two that arrive earliest:

1. **The logo as SVG or transparent PNG ≥ 512×512** — a JPG can't make a favicon or an OG card
   (needed by phase 1).
2. **The canonical domain** — `www.innochipdesign.ru` or the campus host. It is baked into every
   canonical URL at build time (needed by phase 7).

## Next step

Start **Phase 0** in [09-implementation-plan.md](09-implementation-plan.md): commit the deletion of
the old Next.js app, drop the GitHub Actions workflow, and scaffold Astro.
