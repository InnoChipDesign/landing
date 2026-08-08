# SEO, Metadata & Performance

Implements D12 (core meta + generated OG images + JSON-LD, no RSS) and D13 (no analytics).

## 1. Per-page metadata

A single `<Seo>` component in `BaseLayout` takes a typed props object; every page must supply it.
Missing required fields fail `astro check`, so no page can ship with a default title.

```ts
type SeoProps = {
  title: string;              // ≤ 60 chars, without the site-name suffix
  description: string;        // 120–160 chars
  canonical?: URL;            // defaults to Astro.url resolved against `site`
  image?: ImageMetadata | string;
  type?: 'website' | 'article';
  noindex?: boolean;
  publishedAt?: Date;
  updatedAt?: Date;
};
```

Emitted:

```html
<title>schoolRISCV — InnoChipDesign</title>
<meta name="description" content="…">
<link rel="canonical" href="https://www.innochipdesign.ru/club/projects/school-riscv">

<meta property="og:type"        content="article">
<meta property="og:site_name"   content="InnoChipDesign">
<meta property="og:title"       content="schoolRISCV — a teaching CPU, step by step">
<meta property="og:description" content="…">
<meta property="og:url"         content="https://…/club/projects/school-riscv">
<meta property="og:image"       content="https://…/og/school-riscv.png">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt"   content="schoolRISCV — a project by InnoChipDesign">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="…">
<meta name="twitter:description" content="…">
<meta name="twitter:image" content="https://…/og/school-riscv.png">
```

Rules:
- Titles: `<page> — InnoChipDesign`. `/club` uses `InnoChipDesign — Innopolis community dedicated to
  FPGA, ASIC and RISC-V`. The portal at `/` uses `InnoChipDesign` alone.
- `description` comes from the project `summary` (already length-bounded in the schema) or from an
  explicit page description. Never auto-truncated body prose.
- **OG image URLs must be absolute.** This is why `site` must be correct at build time
  (`08-deployment.md` §2). A relative OG URL silently produces link previews with no image.
- `/club/projects?…` filtered views carry `<link rel="canonical" href="…/club/projects">` so query
  permutations don't fragment indexing. They are **not** `noindex` — a shared filtered link should
  still work if someone links to it.
- **Telegram is the club's main channel**, and Telegram renders `og:*` for pasted links. The OG card
  is therefore the most-seen surface on the whole site — worth more care than the `twitter:*` tags.

### Two zones, one origin

`/` (portal) and `/club/*` are the same origin and appear in the same sitemap. Two consequences:

- The portal is the site's homepage as far as search engines are concerned, but the *content* lives
  under `/club`. `WebSite` JSON-LD goes on `/`, `Organization` goes on both, and `/` carries an
  explicit link to `/club` in the HTML (not only in JavaScript) so the crawl path is obvious.
- 🔴 **Only one hostname may serve the site** (D30). Two domains serving identical HTML splits
  ranking and duplicates every canonical. Resolution in `11-club-data.md` §2: pick one, redirect the
  other at the university proxy.

## 2. Generated OG images

`src/pages/og/[slug].png.ts` — a static endpoint, one PNG per project, rendered at build with
`satori` (HTML/CSS → SVG) then `@resvg/resvg-js` (SVG → PNG).

```
┌────────────────────────────────────────────────────────┐ 1200×630
│  ◆ INNOCHIPDESIGN                                      │
│                                                        │
│  schoolRISCV — a teaching CPU,                         │  Source Serif 4, 64px
│  step by step                                          │  wraps to max 3 lines
│                                                        │
│  A minimal RISC-V core built one stage at a time,      │  Inter 28px, muted,
│  from a single-cycle datapath to a pipeline.           │  max 2 lines, ellipsis
│                                                        │
│  RISC-V · CPU · FPGA                        2024       │  Inter 24px
└────────────────────────────────────────────────────────┘
   left accent bar in --color-accent
```

Implementation notes:
- Fonts must be passed to satori as `ArrayBuffer`s read from `src/assets/fonts/` — satori does no font
  loading of its own.
- satori supports a deliberately limited CSS subset (flexbox only, no grid, explicit dimensions).
  Keep the template simple; it is not a webpage.
- Budget ~0.5–1 s per image. At 20 projects that is well under a minute in the Docker build. At the
  club's growth rate the ~200-project point where caching by a hash of `{title, summary, tags, year}`
  becomes worthwhile is decades away.
- Non-project pages use one static hand-made `og-default.png`. The **portal** gets its own
  `og-portal.png` — a link to `/` pasted in a chat should not preview as a project page.
- 🔴 The template needs the logo as SVG (`06-design-system.md` §7).

## 3. JSON-LD

Built by `src/lib/seo.ts`, emitted as `<script type="application/ld+json">`.

| Page | Types |
|---|---|
| `/` | `Organization` + `WebSite` |
| all `/club/*` | `Organization` — name, url, logo, foundingDate `2023`, sameAs (Telegram, GitHub), `parentOrganization` = Innopolis University |
| `/club/projects/<slug>` | `CreativeWork` — name, description, image, dateCreated, keywords, `author` as `Person[]`, `about`, `award`; **`SoftwareSourceCode`** instead when the project's primary artifact is a repository (which, for this club, is most of them — use `links.repo` presence as the discriminator) |
| project with video | `VideoObject` — name, description, thumbnailUrl, embedUrl, uploadDate |
| `/club/events` | `Event[]` — name, startDate, location, organizer |
| `/club/contact` | `ContactPage` + `PostalAddress` |
| any nested page | `BreadcrumbList` — including the `/club` hop, so breadcrumbs read `InnoChipDesign › Projects › schoolRISCV` |

Two club-specific notes:

- `SoftwareSourceCode` should carry `programmingLanguage: ["SystemVerilog", "Verilog"]` and
  `codeRepository` from `links.repo`. For a hardware club this is more accurate than `CreativeWork`
  and is what makes a project page legible to a recruiter's tooling.
- `VideoObject` is what makes Google show a video thumbnail next to the result — worth the few lines
  for a club whose whole point is demos. `uploadDate` is required for eligibility; derive it from
  `updated` or `year` and note in the authoring guide that a real date is better. **`embedUrl` is
  still emitted even though the page uses a click-to-load facade** — the markup describes the video,
  not the loading strategy, and omitting it forfeits the rich result for no privacy gain.

## 4. `robots.txt` and sitemap

```
User-agent: *
Allow: /
Disallow: /originals/          # full-resolution files: linked, not crawled
Sitemap: {SITE_URL}/sitemap-index.xml
```

`@astrojs/sitemap` config: exclude `/404` and `/og/*`. `/club/projects/page/*` no longer exists
(D22), so that exclusion is gone. `lastmod` from the project's `updated` field where present.

`robots.txt` is **generated at build time** from `SITE_URL` rather than being a static file, because
it must carry the absolute sitemap URL — a hardcoded domain there is the second-most-common
deployment mistake after a wrong `site`.

## 5. Performance budgets

| Metric | Budget | Notes |
|---|---|---|
| LCP | < 1.5 s (fast 3G, simulated) | Hero image preloaded, fonts preloaded |
| CLS | 0 | Explicit dimensions on every image; facade and iframe share one aspect-ratio box |
| INP | < 200 ms | Only `/club/projects` has meaningful interaction |
| JS on the 9 non-project routes (`/`, `/club`, about, events, equipment, resources, join, contact, 404) | **0 KB framework** | Astro only |
| JS on `/club/projects` | **< 30 KB** gzipped, incl. Preact | Was < 80 KB with React; Pagefind chunks load on demand |
| JS on `/club/projects/<slug>` | **< 12 KB** gzipped | Preact + Lightbox, `client:visible`; **0 KB** on a project with no gallery |
| CSS | < 25 KB gzipped | Tailwind v4, purged |
| Fonts | < 260 KB total, 3 files | Latin subset, variable, `swap`, preloaded |
| Total page weight (project detail) | < 900 KB incl. images | Video contributes 0 until clicked |
| Third-party requests before interaction | **0, every route** | The facade (D10) is what buys this |

The last row is the one to defend. It is unusual for a site with embedded video, it is why no cookie
banner is needed, and it is lost the moment someone adds an analytics snippet or a live map embed.

Enforcement: a `pnpm build:report` script prints per-route asset sizes; regressions past budget are a
review comment, not a silent merge.

## 6. Non-goals

- **No RSS feed.** Not selected; easy to add later via `@astrojs/rss` if members ask.
- **No analytics, no tracking pixels, no consent banner** (D13). The site sets no cookies of its own;
  `localStorage` holds only the theme preference, which is exempt from consent requirements as strictly
  necessary functionality the user chose.
- **No third-party fonts, icons, scripts or maps at runtime.** The only third-party request the site
  can make is a video iframe, and only after a visitor clicks a play button.
- **No AMP, no service worker, no PWA install prompt.** A static site is already fast; a service
  worker mostly adds a cache-invalidation problem.
