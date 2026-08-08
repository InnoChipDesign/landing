# InnoChipDesign

The website for the Innopolis Chip Design Club. A static Astro 7 site: no CMS, no database, no
backend, no hosting-provider binding. One build serves two zones — a portal at `/` and the club
site under `/club`.

- **Design and specification:** [`planning/`](planning/) — start with
  [`00-decisions.md`](planning/00-decisions.md) (every decision) and
  [`11-club-data.md`](planning/11-club-data.md) (every club fact).
- **Adding content:** [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Deploying:** [`DEPLOY.md`](DEPLOY.md)

## Quick start

```bash
pnpm install
pnpm dev                                    # http://localhost:4321
SITE_URL=http://localhost:4321 pnpm build   # SITE_URL has no default, deliberately
pnpm check && pnpm test
```

## What is built

| Route | State |
|---|---|
| `/` portal, `/club`, `/club/projects`, `/club/projects/<slug>` | working |
| `/club/about`, `/club/events`, `/club/resources`, `/club/join`, `/club/contact`, `/404` | working |
| `/club/equipment` | generated only once `src/data/equipment.yaml` has rows (D31) |
| `/styleguide` | scratch route, `noindex`, excluded from the sitemap |

All eleven routes ship **zero framework JavaScript** today. The two Preact islands specified in
`01-architecture.md` §4 — `ProjectExplorer` and `Lightbox` — are not built yet, and both pages
degrade to their no-JS baseline in the meantime: `/club/projects` server-renders the complete list,
and a gallery renders as plain links to the original files.

## Not yet built

Tracked against the phases in [`planning/09-implementation-plan.md`](planning/09-implementation-plan.md):

- **Phase 3** — `Lightbox` island, `Figure`, the OG-image route.
- **Phase 4** — `ProjectExplorer` island, `src/lib/search.ts`, `src/lib/url-state.ts`. The Pagefind
  markup contract and the indexing step are already wired.
- **Phase 6** — generated OG images (satori + resvg), JSON-LD builders.
- **Phase 7** — the CSP, shipped report-only first (D29).

## Blocked on the club leader

Nothing here blocks the code, but each one leaves a marked placeholder in the tree
([`11-club-data.md`](planning/11-club-data.md) §11):

1. **The logo**, as SVG or transparent PNG ≥ 512×512. A JPG cannot produce `favicon.svg` and gives
   an opaque white box for the touch icon and the OG template. Placeholders: `src/assets/logo.svg`,
   `public/favicon.svg`.
2. **The canonical domain (D30)** — `www.innochipdesign.ru` or the campus host. It is baked into
   every canonical URL, sitemap entry and OG URL at build time, so it must be settled before the
   first production build. See `.env.example`.
3. **One real sentence each for VCD and HW** — the only text a portal visitor reads before clicking.
   Placeholders in `src/data/services.yaml`.
4. **The equipment list** — until it has rows, `/club/equipment` does not exist.
5. **Curated links** for `/club/resources`.
6. **The 2024 SoC Design Challenge result** — track, placement, team. Until then the site says the
   checkable version ("placed in 2024"), not "won".
7. **Approval of the drafted About and Join copy.** Both files carry `draftCopy: true`, which
   renders a visible warning on the page — nothing drafted can ship unnoticed.
