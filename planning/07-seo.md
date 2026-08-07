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
<title>Autonomous Rover — Club Name</title>
<meta name="description" content="…">
<link rel="canonical" href="https://club.example.edu/projects/autonomous-rover">

<meta property="og:type"        content="article">
<meta property="og:site_name"   content="Club Name">
<meta property="og:title"       content="Autonomous Rover">
<meta property="og:description" content="…">
<meta property="og:url"         content="https://…/projects/autonomous-rover">
<meta property="og:image"       content="https://…/og/autonomous-rover.png">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt"   content="Autonomous Rover — a project by Club Name">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="…">
<meta name="twitter:description" content="…">
<meta name="twitter:image" content="https://…/og/autonomous-rover.png">
```

Rules:
- Titles: `<page> — <Club Name>`; the homepage uses `<Club Name> — <tagline>`.
- `description` comes from the project `summary` (already length-bounded in the schema) or from an
  explicit page description. Never auto-truncated body prose.
- **OG image URLs must be absolute.** This is why `site` must be correct at build time
  (`08-deployment.md` §2). A relative OG URL silently produces link previews with no image.
- `/projects?…` filtered views carry `<link rel="canonical" href="/projects">` so query permutations
  don't fragment indexing. They are not `noindex` — a shared filtered link should still work if
  someone links to it.

## 2. Generated OG images

`src/pages/og/[slug].png.ts` — a static endpoint, one PNG per project, rendered at build with
`satori` (HTML/CSS → SVG) then `@resvg/resvg-js` (SVG → PNG).

```
┌────────────────────────────────────────────────────────┐ 1200×630
│  ◆ CLUB NAME                                           │
│                                                        │
│  Autonomous Rover                                      │  Source Serif 4, 64px
│                                                        │  wraps to max 3 lines
│  A four-wheeled rover that maps an indoor course       │  Inter 28px, muted,
│  and navigates it without human input.                 │  max 2 lines, ellipsis
│                                                        │
│  robotics · computer vision · embedded      2025       │  Inter 24px
└────────────────────────────────────────────────────────┘
   left accent bar in --color-accent
```

Implementation notes:
- Fonts must be passed to satori as `ArrayBuffer`s read from `src/assets/fonts/` — satori does no font
  loading of its own.
- satori supports a deliberately limited CSS subset (flexbox only, no grid, explicit dimensions).
  Keep the template simple; it is not a webpage.
- Budget ~0.5–1 s per image. At 40 projects that is under a minute, acceptable in a Docker build. If
  the project count passes ~200, cache by a hash of `{title, summary, tags, year}`.
- Non-project pages use one static hand-made `og-default.png` — generating a card for `/about` adds
  nothing.

## 3. JSON-LD

Built by `src/lib/seo.ts`, emitted as `<script type="application/ld+json">`.

| Page | Types |
|---|---|
| all | `Organization` (+ `WebSite`) with name, url, logo, sameAs, `parentOrganization` = the university |
| `/projects/<slug>` | `CreativeWork` — name, description, image, dateCreated, keywords, `author` as `Person[]`, `about`, `award`; `SoftwareSourceCode` instead when the project's primary artifact is a repository |
| project with video | `VideoObject` — name, description, thumbnailUrl, embedUrl, uploadDate |
| `/events` | `Event[]` — name, startDate, location, organizer |
| `/contact` | `ContactPage` |
| any nested page | `BreadcrumbList` |

`VideoObject` is what makes Google show a video thumbnail next to the result — worth the few lines
for a club whose whole point is demos. `uploadDate` is required by Google for it to be eligible;
derive it from the project's `updated` or `year` and note in the authoring guide that a real date is
better.

## 4. `robots.txt` and sitemap

```
User-agent: *
Allow: /
Disallow: /originals/          # full-resolution files: linked, not crawled
Sitemap: {SITE_URL}/sitemap-index.xml
```

`@astrojs/sitemap` config: exclude `/404`, `/og/*`, and `/projects/page/*` (they duplicate
`/projects`). `lastmod` from the project's `updated` field where present.

`robots.txt` contains the absolute sitemap URL, so it is generated at build time from `SITE_URL`
rather than being a static file — a hardcoded domain there is the second-most-common deployment
mistake after a wrong `site`.

## 5. Performance budgets

| Metric | Budget | Notes |
|---|---|---|
| LCP | < 1.5 s (fast 3G, simulated) | Hero image preloaded, fonts preloaded |
| CLS | 0 | Explicit dimensions on every image and iframe |
| INP | < 200 ms | Only `/projects` has meaningful interaction |
| JS on `/`, `/about`, `/events`, `/resources`, `/join`, `/contact` | **0 KB framework** | Astro only |
| JS on `/projects` | < 80 KB gzipped, incl. React | Pagefind chunks load on demand |
| JS on `/projects/<slug>` | < 55 KB gzipped | React + Lightbox, `client:visible` |
| CSS | < 25 KB gzipped | Tailwind v4, purged |
| Fonts | < 260 KB total, 3 files | Latin subset, variable, `swap`, preloaded |
| Total page weight (project detail) | < 900 KB incl. images | |

Enforcement: a `pnpm build:report` script prints per-route asset sizes; regressions past budget are
a review comment, not a silent merge.

## 6. Non-goals

- **No RSS feed.** Not selected; easy to add later via `@astrojs/rss` if members ask.
- **No analytics, no tracking pixels, no consent banner** (D13). The site sets no cookies of its own;
  `localStorage` holds only the theme preference, which is exempt from consent requirements as strictly
  necessary functionality the user chose.
- **No third-party fonts, icons, or scripts at runtime.** The only third-party request the site can
  make is the video iframe, and only on project pages that have one.
- **No AMP, no service worker, no PWA install prompt.** A static site is already fast; a service
  worker mostly adds a cache-invalidation problem.
