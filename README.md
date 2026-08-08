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
SITE_URL=http://localhost:4321 pnpm verify  # check + test + build + dist assertions
```

`SITE_URL` has no default and a build refuses without it. Canonical URLs, the sitemap, the OG card
URLs and the structured data are all baked in at build time, so an image built against the wrong
domain serves wrong link previews and nothing looks broken until somebody shares a link.

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server. Pagefind's index does not exist here — see `pnpm search:dev`. |
| `pnpm build` | `astro check` → `astro build` → Pagefind index. |
| `pnpm verify` | The above plus `pnpm test` and `pnpm check:dist`. Run this before a PR. |
| `pnpm check:dist` | Post-build assertions against `dist/` (see below). |
| `pnpm search:dev` | Builds once and copies the Pagefind index into `public/` so search works in dev. |
| `pnpm icons` | Regenerates the favicon/OG raster set from `src/assets/logo.svg`. |

## What is built

Every route in `05-sitemap-and-pages.md` §1, plus both islands, search, the generated OG cards, the
structured data and the generated CSP.

| Route | Notes |
|---|---|
| `/` | The portal. `Organization` + `WebSite` JSON-LD. |
| `/club`, `/club/about`, `/club/events`, `/club/resources`, `/club/join`, `/club/contact` | |
| `/club/projects` | Complete server-rendered list + the `ProjectExplorer` island |
| `/club/projects/<slug>` | Three real projects. `SoftwareSourceCode` JSON-LD, Pagefind-indexed |
| `/club/equipment` | **Not generated at all** until `src/data/equipment.yaml` has rows (D31) |
| `/og/<slug>.png` | Generated 1200×630 cards, one per project plus `default` and `portal` |
| `/robots.txt`, `/sitemap-index.xml` | Generated, carrying the build-time domain |
| `/styleguide` | Scratch route, `noindex`, excluded from the sitemap |

### JavaScript, measured

There are exactly two islands (D11, Preact), and both are enhancements of DOM that already works
without them.

| Route | Framework JS (gzipped) | Budget (`07` §5) |
|---|---|---|
| `/`, `/club`, about, events, resources, join, contact, 404 | **0 KB** | 0 KB |
| `/club/projects/<slug>` with no gallery | **0 KB** | 0 KB |
| `/club/projects/<slug>` with a gallery (`Lightbox`) | ~8.2 KB | < 12 KB |
| `/club/projects` (`ProjectExplorer`) | ~10.6 KB | < 30 KB |
| CSS, every route | 7.2 KB | < 25 KB |
| Fonts, three variable woff2 | 139 KB | < 260 KB |

Third-party requests before interaction: **zero, on every route.** The only one the site can make
is a video iframe, and only after a visitor clicks a play button (D10). That is why there is no
cookie banner.

### `pnpm check:dist`

The failures worth automating are the silent ones — the page still renders and the build still
succeeds. `scripts/check-dist.mjs` asserts, against real build output: the Pagefind index exists and
the markup contract is intact on every project page; the directory server-renders and links **every**
project (the "island swallowed the list" failure, visible only with JS off); every row has a
thumbnail or a stub; the CSP's hashes cover every inline script that actually shipped; and — when
`SITE_URL` is a real domain — that the canonical, OG, sitemap and robots URLs all carry it.

## Not yet built

- **Phase 8** — the remaining ~15 projects, real equipment and resource rows, real event entries,
  and the accessibility and Lighthouse passes.
- A browser-driven test for the two islands. They are verified by hand and by the DOM assertions
  above; there is no headless browser in the toolchain, deliberately, but that is the gap.

## Blocked on the club leader

Each one leaves a marked placeholder in the tree ([`11-club-data.md`](planning/11-club-data.md) §11):

1. **The canonical domain (D30)** — `www.innochipdesign.ru` or the campus host. Baked into every
   canonical, sitemap entry and OG URL at build time, so it must be settled before the first
   production build. Note that `innochipdesign.ru` does not currently resolve. See `.env.example`.
2. **Real URLs for VCD and Homework.** The descriptions in `src/data/services.yaml` are the
   leader's; the addresses are invented placeholders that do not resolve. An external URL is just a
   string, so no build check can catch a wrong one — it ships as a dead card on the front page.
3. **One photo per project.** No seeded project has a cover, so the whole directory renders as
   generated stubs (D21). The stub solves uniformity, not emptiness, and this is the single
   highest-value content action available.
4. **Team credit names.** Two of the three projects credit contributors by GitHub handle, because
   their real names are not published anywhere the club controls. Replace them once consent is
   recorded (D8, `02` §5).
5. **The equipment list** — until it has rows, `/club/equipment` does not exist.
6. **Curated links** for `/club/resources`.
7. **The 2024 SoC Design Challenge result** — track, placement, team. Until then the site says the
   checkable version ("placed in 2024"), not "won".
8. **Approval of the drafted About and Join copy.** Both carry `draftCopy: true`, which renders a
   visible warning on the page — nothing drafted can ship unnoticed.
