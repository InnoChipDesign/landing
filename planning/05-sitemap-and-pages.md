# Site Map & Page Specifications

Implements D15, D16, D17, D18.

## 1. Route table

| Route | Source | Prerendered | Notes |
|---|---|---|---|
| `/` | `pages/index.astro` | ✓ | Showcase-first |
| `/projects` | `pages/projects/index.astro` | ✓ | React island; full grid server-rendered |
| `/projects/page/[n]` | same | ✓ | No-JS pagination fallback |
| `/projects/[slug]` | `pages/projects/[slug].astro` | ✓ | One per non-draft project |
| `/about` | `pages/about.astro` + `content/pages/about.mdx` | ✓ | |
| `/events` | `pages/events.astro` | ✓ | Reverse-chronological |
| `/resources` | `pages/resources.astro` | ✓ | Includes **Services built by us** |
| `/join` | `pages/join.astro` + `content/pages/join.mdx` | ✓ | |
| `/contact` | `pages/contact.astro` | ✓ | |
| `/404` | `pages/404.astro` | ✓ | Caddy serves it on any miss |
| `/og/[slug].png` | `pages/og/[slug].png.ts` | ✓ | Generated OG cards |
| `/sitemap-index.xml` | `@astrojs/sitemap` | ✓ | |
| `/robots.txt` | `public/` | ✓ | |

**Explicitly absent:** `/team`, `/team/[slug]`, `/news`, `/services`, any RSS feed, any search-results
page (search lives inside `/projects`).

## 2. Global chrome

### Header

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ◆ CLUB NAME     Projects  About  Events  Resources  Join      [VCD ↗] [HW ↗]  ☾ │
└───────────────────────────────────────────────────────────────────────────────┘
```

- Sticky on scroll with a subtle bottom border that appears only once scrolled (no shadow at rest).
- The two right-hand buttons are the `primary: true` entries from `services.yaml` (D16). They are
  visually distinct from nav links — outlined buttons with a small ↗ glyph — because they leave the
  site. `target="_blank" rel="noopener noreferrer"`, and an `aria-label` that says "opens in a new tab".
- `Contact` is **not** in the header; it lives in the footer and as the `/join` secondary CTA. Seven
  header items is already the practical limit before the bar feels crowded.
- Below `lg`, nav collapses into a `<dialog>`-based mobile menu (Astro + inline script, no React —
  see `01-architecture.md` §3).
- Theme toggle (`☾`) sits last. Light is the default (D-design); the choice persists in
  `localStorage` and applies before first paint via a tiny blocking inline script to avoid a flash.

### Footer

Four columns collapsing to one on mobile: club identity + one-line description · site links ·
external services · contact and social. Bottom row: copyright, university affiliation, and a
"built by the club" line linking to this site's own repository.

## 3. `/` — Home (showcase-first, D17)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  HERO                                                                     ║
║  ┌───────────────────────────────┐  ┌──────────────────────────────────┐  ║
║  │ <Club Name>                   │  │                                  │  ║
║  │ One-sentence pitch — what the │  │   [ photo: members at work,      │  ║
║  │ club builds and for whom.     │  │     wide, optimized, eager ]     │  ║
║  │                               │  │                                  │  ║
║  │ [ See our projects ]  [ Join ]│  │                                  │  ║
║  └───────────────────────────────┘  └──────────────────────────────────┘  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  FEATURED PROJECTS            "38 projects and counting →"                ║
║  ┌─────────┐ ┌─────────┐ ┌─────────┐   (projects with featured: true,     ║
║  │ [cover] │ │ [cover] │ │ [cover] │    newest first, max 6, min 3)       ║
║  │ Title   │ │ Title   │ │ Title   │                                      ║
║  │ summary │ │ summary │ │ summary │    → each links to /projects/<slug>  ║
║  │ ●tags   │ │ ●tags   │ │ ●tags   │                                      ║
║  └─────────┘ └─────────┘ └─────────┘                                      ║
║                      [ Browse all projects → ]                            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  WHAT WE DO — 3–4 focus areas, icon + heading + 2 lines each               ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  MISSION      short prose (2–3 paragraphs) + one photo                     ║
║               ┌────────────────────────────────────────────────────┐      ║
║               │  38 projects · 24 members · 6 awards · since 20XX  │      ║
║               └────────────────────────────────────────────────────┘      ║
║               ↑ counts computed from content at build time, never typed   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  TEAM                                                                     ║
║  Current members — photo grid, name + role  (people.yaml, showOnHome)     ║
║  Alumni — compact text list, name + years                                 ║
║  (names are chips linking to /projects?team=<id> — no person pages, D8)   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  JOIN CTA band                                                            ║
║  "Meetings every <day> at <time>, <room>."                                ║
║  [ Apply to join ↗ ]   [ Ask us in <chat> ↗ ]                             ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

Design constraints:
- The stats band's numbers are **derived** (`getCollection('projects').length`, etc.). Hardcoded
  numbers go stale and every visitor who notices stops trusting the rest of the page.
- The featured row degrades gracefully: with fewer than 3 featured projects, it falls back to the 3
  newest. The homepage must never render an empty section.
- Hero image is the LCP element — `loading="eager"`, `fetchpriority="high"`, preloaded.

## 4. `/projects` — Directory

Fully specified in `03-search-and-filtering.md`. Page-level notes:

- `<h1>Projects</h1>` plus one line of context above the controls.
- Filter panel is a left sidebar at `lg`+ and a collapsible `<details>` block below `md`.
- Card anatomy: cover (4:3) · title · summary (2 lines, clamped) · tag chips · `year · status`.
  The **whole card is one link**; tag chips inside it are decorative, not nested links (nested
  interactive elements are an accessibility failure).
- Cards use `content-visibility: auto` so a 100-project grid stays fast.

## 5. `/projects/<slug>` — Project detail

```
╔════════════════════════════════════════════════════════════════════════════╗
║ ← All projects                                                             ║
║                                                                            ║
║ Autonomous Rover                                    2025 · Spring          ║
║ ┌──────────────────────────────────────────────┐    [● Completed]          ║
║ │ A four-wheeled rover that maps an indoor     │                           ║
║ │ course and navigates it without human input. │    [robotics][cv][embedded]║
║ └──────────────────────────────────────────────┘                           ║
║                                                                            ║
║ ┌──────────────────────────────────────────────┐  ┌──────────────────────┐ ║
║ │                                              │  │ TEAM                 │ ║
║ │        ▶  demo video (16:9 iframe)           │  │ Ivan Petrov Firmware │ ║
║ │        (or hero image if no video)           │  │ Maria S.    Percept. │ ║
║ │                                              │  │  ↑ chips → filtered  │ ║
║ └──────────────────────────────────────────────┘  │    project list      │ ║
║                                                    ├──────────────────────┤ ║
║ ## The problem                                     │ LINKS                │ ║
║ …prose…                                            │ ↗ Repository         │ ║
║                                                    │ ↗ Paper (PDF)        │ ║
║ ## How it works                                    │ ↗ Live demo          │ ║
║ …prose, inline figures, code blocks…               ├──────────────────────┤ ║
║                                                    │ TECH                 │ ║
║ ## Results                                         │ ROS 2 · PyTorch · C++│ ║
║ …prose…                                            │ Jetson Orin Nano     │ ║
║                                                    │ RPLIDAR A1           │ ║
║                                                    │ Custom PCB           │ ║
║                                                    ├──────────────────────┤ ║
║                                                    │ AWARDS               │ ║
║                                                    │ 🏆 2nd place, URC '25│ ║
║                                                    └──────────────────────┘ ║
║ ── GALLERY ───────────────────────────────────────────────────────────────  ║
║ [thumb] [thumb] [thumb] [thumb]   → lightbox → "View original (11.4 MB)"    ║
║                                                                            ║
║ ── RELATED ───────────────────────────────────────────────────────────────  ║
║ 3 projects sharing the most tags, excluding this one                        ║
╚════════════════════════════════════════════════════════════════════════════╝
```

- Sidebar collapses **below** the body on mobile, in the order: team → links → tech → awards.
- Every sidebar block is omitted entirely when its data is empty — no "Awards: none".
- Prose width capped at ~68ch for readability; figures may break out to full column width.
- Related projects are computed at build time by tag overlap; ties broken by recency.

## 6. `/about`

Long-form MDX (`content/pages/about.mdx`) rendered in `PageLayout`, with a short table of contents on
`lg`+. Sections: what the club is · history / timeline · how we work (meetings, project process) ·
faculty advisor and department affiliation · full member and alumni roster.

## 7. `/events` — reverse-chronological (D)

```
Events
Next meeting: <day> <time>, <room>          ← pinned banner, edited manually
──────────────────────────────────────────
2026
  ● 12 Mar · Workshop     Intro to ROS 2            Room 302
  ● 04 Feb · Competition  University Robotics Cup   Main hall   ↗ results
2025
  ● 18 Nov · Demo day     Autumn project showcase              [3 photos]
```

- One flat list, newest first, grouped under year headings.
- No upcoming/past computation (D) — the pinned banner covers "what's next" and cannot go stale
  silently, because it is one obviously-editable line rather than a date comparison frozen at build time.
- Each entry may carry a short body, a link and photos; entries without a body render as a single row.

## 8. `/resources`

Two distinct halves:

```
Resources
─────────────────────────────────────────────────────
SERVICES BUILT BY US                         ← services.yaml (D16)
┌──────────────────────┐ ┌──────────────────────┐
│ [screenshot]         │ │ [screenshot]         │
│ <VCD name>     LIVE  │ │ <HW name>      LIVE  │
│ one-line tagline     │ │ one-line tagline     │
│ [ Open ↗ ]           │ │ [ Open ↗ ]           │
└──────────────────────┘ └──────────────────────┘
(retired services render greyed, still listed — they are part of the club's record)
─────────────────────────────────────────────────────
GETTING STARTED     curated external links, grouped
LAB & EQUIPMENT     what we have, how to book it
GUIDES              internal how-tos (MDX)
TEMPLATES           project report, poster template
```

Fully public (D). External links carry the ↗ glyph and `rel="noopener"`.

## 9. `/join` (D18)

```
Join the club
Who we're looking for — 2 short paragraphs, no gatekeeping language
What you'll do — 3–4 bullets
How it works
  1. Apply →  2. Intro chat  →  3. Pick a project  →  4. Build
[ Apply via the form ↗ ]     ← primary CTA, external form
[ Ask a question in <chat> ↗ ] ← secondary CTA
Meetings: <day> <time>, <room>.  Just showing up is also fine.
FAQ — 5–6 items in <details> (no framework needed)
```

The "just showing up is fine" line is deliberate: a form as the only path filters out exactly the
shy first-years a student club most wants to reach.

## 10. `/contact`

Channels (chat, email, social), physical location with a static map image (not an embedded map —
that would be a third-party tracker on a site with no analytics), department affiliation, and a note
on who to contact for what (join / press / collaboration).

## 11. `/404`

Club-appropriate short message, plus links to `/` and `/projects`, plus a link to the projects search.
Caddy is configured to serve `404.html` on any unmatched path (see `08-deployment.md`).

## 12. Future i18n

If a second language is ever needed, exactly three things change: (1) `astro.config.mjs` gains an
`i18n` block and routes move under `src/pages/[lang]/`; (2) collections gain a `lang` field and a
per-language folder; (3) Pagefind is run per language with its language packs. Nothing in the
component layer assumes English beyond copy strings, which live in `src/data/site.ts` and the MDX
files. Noted so the English-only decision (D3) stays cheap to revisit.
