# Site Map & Page Specifications

Implements D15–D20, D26, D27.

Copy drafted here is marked 🟡 — it is a proposal written from the leader's answers and the public
sources in `11-club-data.md`, not text the leader supplied. It is meant to be edited, not shipped
unread.

## 1. Route table

| Route | Source | Zone | Notes |
|---|---|---|---|
| `/` | `pages/index.astro` | portal | Grid of club web properties. No nav, no footer nav, 0 KB JS |
| `/club` | `pages/club/index.astro` | club | Showcase-first home |
| `/club/projects` | `pages/club/projects/index.astro` | club | Island; **full** list server-rendered |
| `/club/projects/[slug]` | `pages/club/projects/[slug].astro` | club | One per non-draft project |
| `/club/about` | `pages/club/about.astro` + `content/pages/about.mdx` | club | |
| `/club/events` | `pages/club/events.astro` | club | Reverse-chronological |
| `/club/equipment` | `pages/club/equipment.astro` | club | Flat lab inventory, no subpages (D31) |
| `/club/resources` | `pages/club/resources.astro` | club | Includes **Services built by us** |
| `/club/join` | `pages/club/join.astro` + `content/pages/join.mdx` | club | |
| `/club/contact` | `pages/club/contact.astro` | club | |
| `/404` | `pages/404.astro` | neutral | Caddy serves it on any miss, in either zone |
| `/og/[slug].png` | `pages/og/[slug].png.ts` | — | Generated OG cards, excluded from sitemap |
| `/sitemap-index.xml` | `@astrojs/sitemap` | — | |
| `/robots.txt` | generated at build from `SITE_URL` | — | |

**Explicitly absent:** `/team`, `/team/[slug]`, `/news`, `/services`, `/club/equipment/[slug]`
(D31 — no subpages), `/club/projects/page/[n]` (D22), any RSS feed, any standalone search-results
page (search lives inside `/club/projects`).

All internal links are built through `src/lib/routes.ts` (`01-architecture.md` §2). No component
concatenates the `/club` prefix by hand.

## 2. `/` — Portal (D19)

The domain root is a **switchboard**, not a page. Its whole job is to get a visitor to the right
property in one click. It is the only route with no header nav and no footer nav.

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                             ◆  InnoChipDesign                             ║
║              Innopolis community dedicated to FPGA, ASIC and RISC-V.      ║
║                                                                           ║
║   ┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────┐ ║
║   │  ◆                    │ │  ⎍                    │ │  ✎              │ ║
║   │  The Club             │ │  VCD              ↗   │ │  HW         ↗   │ ║
║   │                       │ │                       │ │                 │ ║
║   │  Projects, events     │ │  <one real sentence>  │ │  <one sentence> │ ║
║   │  and how to join.     │ │                       │ │                 │ ║
║   └───────────────────────┘ └───────────────────────┘ └─────────────────┘ ║
║                                                                           ║
║        Innopolis University · Founded 2023 · Telegram · GitHub            ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

- Cards are generated from `services.yaml` entries with `onPortal: true` — the same file that drives
  the header buttons and `/club/resources`. Adding a fourth property is a data change.
- Grid: 1 column below `sm`, 2 at `sm`, 3 at `lg`. With 3 cards it never needs a second row on
  desktop; with 4+ it wraps cleanly.
- `kind: external` cards carry the ↗ glyph, `target="_blank" rel="noopener noreferrer"`, and an
  `aria-label` ending "opens in a new tab".
- Whole card is one link. Optional `screenshot` renders as a muted background image at low opacity —
  never as the card's only content, since a screenshot of a waveform viewer tells a first-time
  visitor nothing.
- The footer strip is plain text plus two icon links. No nav, no columns.
- **Zero JS** except the theme script. This page must be the fastest thing on the domain.

> Design note: the portal must not be mistaken for the club homepage. The three-card layout, absent
> nav and short height are what make the difference legible. If it grows a projects section or an
> about paragraph, it has become a homepage and the `/club` split has lost its point.

## 3. Global chrome (club zone only)

### Header

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ◆ InnoChipDesign  Projects About Events Equipment Resources Join  [VCD↗][HW↗] ☾ │
└────────────────────────────────────────────────────────────────────────────────┘
```

> ⚠️ **The header is now at its limit.** Six nav items plus two buttons plus the toggle is the most a
> single bar carries before it feels crowded, and `Equipment` (D31) is the item that got it there. If
> a seventh page is ever added, the fix is to demote `Equipment` and `Resources` into a single
> `Resources` entry with `Equipment` as its first section link — **not** to keep adding items.
> Deliberately noted now, because "one more nav item" is a decision nobody remembers making.

- The wordmark links to `/club`, **not** to `/`. A small "↖ All sites" text link at the far left, or
  in the footer, is the way back to the portal — putting the portal on the logo would strand visitors
  who expect a logo to mean "home".
- Sticky on scroll with a bottom border that appears only once scrolled (no shadow at rest).
- The two right-hand buttons are `services.yaml` entries with `inHeader: true` (D16). Visually
  distinct from nav links — outlined, with a ↗ glyph — because they leave the site.
- `Contact` is **not** in the header; it lives in the footer and as the `/club/join` secondary CTA.
  Seven header items is already the practical limit.
- Below `lg`, nav collapses into a `<dialog>` mobile menu (Astro + inline script, no framework).
- Theme toggle (`☾`) sits last. Light is default; the choice persists in `localStorage` and applies
  before first paint via a blocking inline script, so there is no flash.

### Footer

Four columns collapsing to one on mobile:

| Column | Contents |
|---|---|
| Identity | Mark, club name, one-line pitch, "Innopolis University · since 2023" |
| Site | Projects · About · Events · Equipment · Resources · Join · Contact |
| Our sites | ↖ All sites (`/`) · VCD ↗ · HW ↗ |
| Reach us | Telegram · email · address (short form) |

Bottom row: copyright, university affiliation, a link to this site's own repository, and — once
confirmed — the partner credit.

## 4. `/club` — Home (showcase-first, D17)

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  HERO                                                                     ║
║  ┌───────────────────────────────┐  ┌──────────────────────────────────┐  ║
║  │ InnoChipDesign                │  │                                  │  ║
║  │ A student engineering         │  │   [ photo: members at a bench    │  ║
║  │ community at Innopolis        │  │     with FPGA boards — wide,     │  ║
║  │ University learning and       │  │     optimized, eager, LCP ]      │  ║
║  │ practising hardware design.   │  │                                  │  ║
║  │                               │  │                                  │  ║
║  │ [ See our projects ] [ Join ] │  │                                  │  ║
║  └───────────────────────────────┘  └──────────────────────────────────┘  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  FEATURED PROJECTS                       "20 projects and counting →"     ║
║  ┌─────────┐ ┌─────────┐ ┌─────────┐   featured: true, newest first,      ║
║  │ [cover] │ │ [cover] │ │ [cover] │   max 3. Cards here (not rows) —     ║
║  │ Title   │ │ Title   │ │ Title   │   this is a teaser, not the list.    ║
║  │ summary │ │ summary │ │ summary │                                      ║
║  │ ●tags   │ │ ●tags   │ │ ●tags   │   → /club/projects/<slug>            ║
║  └─────────┘ └─────────┘ └─────────┘                                      ║
║                  [ Browse all projects → ]                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  WHAT WE DO — 4 focus areas, icon + heading + 2 lines each                 ║
║  FPGA · RISC-V & CPU design · Verification · ASIC flows                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  MISSION      2–3 paragraphs + one photo                                  ║
║               ┌────────────────────────────────────────────────────┐      ║
║               │  20 projects · 4 years of SoC Design Challenge     │      ║
║               │  · since 2023                                      │      ║
║               └────────────────────────────────────────────────────┘      ║
║               ↑ counts computed from content at build time, never typed   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  TEAM — leadership block only (officer: true + advisor). No full roster.   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  JOIN CTA band                                                            ║
║  "We meet every Saturday at 12:00 during the spring and fall semesters."  ║
║  [ Sign up for the Chip Design School ↗ ]  [ Ask us on Telegram ↗ ]        ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

Design constraints:

- **Stats are derived** (D-e): `getCollection('projects').length`, `currentYear - foundedYear`, and so
  on. Hardcoded numbers go stale and every visitor who notices stops trusting the rest of the page.
  Do **not** put a member count in the band — the roster is deliberately partial (D8), so a count
  computed from `people.yaml` would understate the club and a typed one would be a fiction.
- The featured row degrades: with fewer than 3 featured projects it falls back to the 3 newest. The
  homepage never renders an empty section.
- Hero image is the LCP element — `loading="eager"`, `fetchpriority="high"`, preloaded.
- "What we do" content maps onto real tags, so the four cards can link into
  `/club/projects?tags=fpga` etc. Free navigation, no extra content to maintain.

## 5. `/club/projects` — Directory

Fully specified in `03-search-and-filtering.md`. Page-level notes:

- `<h1>Projects</h1>` plus one line of context above the controls.
- **Row list, not a grid** (D20): thumbnail left, title/summary/meta right, generous side margins.
- Filter bar sits above the list — horizontal chip groups, not a left sidebar. With three facets and
  a row list that runs the page's full width, a sidebar would steal width from the rows for no gain.
  Below `md` the facet groups collapse into a `<details>` block.
- No pagination (D22). `content-visibility: auto` per row.

## 6. `/club/projects/<slug>` — Project detail

```
╔════════════════════════════════════════════════════════════════════════════╗
║ ← All projects                                                             ║
║                                                                            ║
║ schoolRISCV — a teaching CPU, step by step        2024 · Fall              ║
║ ┌──────────────────────────────────────────────┐  [● Completed]            ║
║ │ A minimal RISC-V core built one stage at a   │                           ║
║ │ time, from a single-cycle datapath to a      │  [RISC-V][CPU][FPGA]      ║
║ │ pipelined implementation.                    │                           ║
║ └──────────────────────────────────────────────┘                           ║
║                                                                            ║
║ ┌──────────────────────────────────────────────┐  ┌──────────────────────┐ ║
║ │  ▶︎  poster image, 16:9                       │  │ TEAM                 │ ║
║ │     "Loads from Rutube"                      │  │ Mikhail Kuskov       │ ║
║ │     ← click-to-load facade (D10), or the     │  │   Instructor         │ ║
║ │       cover image if there is no video       │  │ A. Student   RTL     │ ║
║ └──────────────────────────────────────────────┘  │  ↑ plain text unless │ ║
║                                                    │    they have a link  │ ║
║ ## The problem                                     ├──────────────────────┤ ║
║ …prose…                                            │ LINKS                │ ║
║                                                    │ ↗ Repository         │ ║
║ ## How it works                                    │ ↗ Paper (PDF)        │ ║
║ …prose, inline figures, code blocks…               ├──────────────────────┤ ║
║                                                    │ TECH                 │ ║
║ ## Results                                         │ SystemVerilog        │ ║
║ …prose…                                            │ Vivado · Verilator   │ ║
║                                                    │ Digilent Basys 3     │ ║
║                                                    ├──────────────────────┤ ║
║                                                    │ AWARDS               │ ║
║                                                    │ 🏆 …                  │ ║
║                                                    └──────────────────────┘ ║
║ ── GALLERY ───────────────────────────────────────────────────────────────  ║
║ [thumb] [thumb] [thumb]   → lightbox → "View original (11.4 MB)"            ║
║                                                                            ║
║ ── RELATED ───────────────────────────────────────────────────────────────  ║
║ 3 projects sharing the most tags, excluding this one                        ║
╚════════════════════════════════════════════════════════════════════════════╝
```

- Sidebar collapses **below** the body on mobile, in the order: team → links → tech → awards.
- Every sidebar block is omitted entirely when its data is empty — no "Awards: none".
- Team credits are **not links to a site filter** (D7/D8). A name links to that person's GitHub or
  site if they supplied one, and is plain text otherwise.
- Prose width capped at ~68ch; figures may break out to full column width.
- Related projects are computed at build time by tag overlap, ties broken by recency. With ~20
  projects and 11 tags, overlap is usually large — break ties toward *different* years so "related"
  doesn't return three games from the same semester.
- Code blocks matter more here than on a typical club site: Verilog/SystemVerilog snippets are the
  substance. Shiki is configured with both light and dark themes (`01-architecture.md` §6), and
  `verilog`/`systemverilog` must be in the loaded grammar set.

## 7. `/club/events`

Flat reverse-chronological list, grouped under year headings. **No dated "next meeting" banner**
(D26) — a standing recurrence line instead, which stays true without maintenance.

```
Events
We meet every Saturday at 12:00 during the spring and fall semesters.
The room is announced in the Telegram chat before each session.   [ Open chat ↗ ]
──────────────────────────────────────────────────────────────────────────────
2026
  ● 24–26 Apr · Competition  SoC Design Challenge 2026 · MIET, Zelenograd   ↗
2025
  ● …
```

- One flat list, newest first. No upcoming/past computation — a date comparison frozen at build time
  silently mislabels events the day after a deploy.
- Each entry may carry a short body, a link and photos; entries without a body render as a single row.

### 🟡 Seed entries

🔴 The leader asked for three examples and supplied none. **These are templates, not records** — the
dates and details are invented to show the shape and must be replaced or deleted before launch. Do
not publish them as-is.

```mdx
--- # src/content/events/2026-soc-design-challenge.mdx
title: SoC Design Challenge 2026
date: 2026-04-24
endDate: 2026-04-26
kind: competition
location: MIET, Zelenograd, Moscow
link: https://edu.yadro.com/soc-design-challenge/
draft: true          # ← flip to false once the club's participation is confirmed in writing
---
The club fielded a team at YADRO and MIET's annual RISC-V SoC design hackathon.
```

```mdx
--- # src/content/events/TEMPLATE-workshop.mdx
title: <Workshop title>
date: 2026-03-14
kind: workshop
location: <room>
draft: true
---
<Two sentences: what was covered, who ran it, what people left with.>
```

```mdx
--- # src/content/events/TEMPLATE-demo-day.mdx
title: <Semester> project showcase
date: 2025-12-06
kind: demo-day
location: <room>
draft: true
---
<Which projects were shown; link the project pages with markdown links.>
```

Each ships with `draft: true`, so nothing invented can reach the built site by accident.

## 8. `/club/equipment` (D31)

What the university lab has, and what a member can build with. Flat, unpaginated, unsearchable — a
lab inventory is read top to bottom.

```
Equipment
What's available in our lab for club projects. Ask in the Telegram chat to borrow
anything on this list.                                          [ Open chat ↗ ]
──────────────────────────────────────────────────────────────────────────────
FPGA BOARDS
┌──────────┐  Digilent Basys 3
│  photo   │  Artix-7 FPGA board with switches, seven-segment display and VGA
│  4:3     │  out. The club's default board.                     ↗ Reference
└──────────┘
┌──────────┐  Tang Nano 9K
│  stub    │  Small Gowin FPGA board, HDMI-capable.
└──────────┘
──────────────────────────────────────────────────────────────────────────────
INSTRUMENTS
┌──────────┐  Logic analyzer
│  stub    │  8-channel USB logic analyzer for debugging bus timing.
└──────────┘
```

- **Reuses `ProjectRow`'s layout and `ProjectCover`'s stub** (D20, D21). Same visual grammar as the
  project directory, so the site has one way of presenting "a thing with a picture and a line of
  text" rather than two.
- The row is a link **only when `link` is set**; otherwise it is a plain `<article>`. A row that
  looks clickable and isn't is worse than one that doesn't.
- `category` produces the section headings. Items with no category render first, ungrouped.
- **How to borrow is one sentence at the top**, not a field per row (`02-content-model.md` §7).
- No JSON-LD. `Product` markup on a lab's borrowed oscilloscope would be noise in a search index.
- 🔴 The list itself is still to be supplied. Until it is, the page ships with `draft`-equivalent
  behaviour: if `equipment.yaml` is empty, **the route and its nav item are not generated at all**.
  An empty "Equipment" page is worse than no Equipment page.

## 9. `/club/resources`

Two distinct halves:

```
Resources
─────────────────────────────────────────────────────
SERVICES BUILT BY US                         ← services.yaml, D16
┌──────────────────────┐ ┌──────────────────────┐
│ [screenshot]         │ │ [screenshot]         │
│ VCD            LIVE  │ │ HW             LIVE  │
│ one-line tagline     │ │ one-line tagline     │
│ [ Open ↗ ]           │ │ [ Open ↗ ]           │
└──────────────────────┘ └──────────────────────┘
(retired services render greyed, still listed — part of the club's record)
─────────────────────────────────────────────────────
GETTING STARTED     Chip Design School · SoC Design Challenge
CLUB REPOSITORIES   InnoChipDesign on GitHub
GUIDES & TEMPLATES  🔴 to be supplied (C5)
```

Equipment used to be a section here; it now has its own page (D31) and this page links to it once
rather than duplicating the list.

Fully public. External links carry the ↗ glyph and `rel="noopener"`. Sections with `items: []` render
nothing at all — no "coming soon" heading (`02-content-model.md` §7).

## 10. `/club/join` (D18)

🟡 Draft structure. The load-bearing part is the honesty about the third-party form
(`11-club-data.md` §5): the primary CTA points at YADRO's Chip Design School, not a club membership
form, and the page must say so or visitors will be confused.

```
Join the club
─────────────────────────────────────────────────────
Everyone is welcome. There is no selection process and no prior
experience required — several current members started by turning up.

What you'll do
  · Learn digital design and write RTL that runs on real FPGA hardware
  · Build a project of your own and publish it here
  · Work toward the SoC Design Challenge if you want to compete

How it works
  1. Sign up for the Chip Design School — the free YADRO/MIET course
     our Saturday sessions follow.                    [ Sign up ↗ ]
  2. Join the Telegram chat, where the room and the week's topic
     are posted.                                      [ Open chat ↗ ]
  3. Just come on Saturday. No application is required to show up.

We meet every Saturday at 12:00 during the spring and fall semesters.
The room is announced in the chat.

FAQ — 5–6 items in <details> (no framework needed)
  · Do I need to know Verilog?           · Which year can join?
  · Do I need my own board?              · Is it graded / for credit?
  · Can I join mid-semester?             · Can I bring my own project?
```

"Just come on Saturday" is deliberate and should survive editing: a form as the only path filters out
exactly the shy first-years a student club most wants to reach.

## 11. `/club/contact`

- Channels: Telegram, email, GitHub.
- Physical address as **text**, with the clickable static map image beside it (D27) — the map is
  never the only carrier of the address.
- Faculty advisor: Mikhail Kuskov, Senior Instructor.
- A short "who to contact for what" note: joining → chat; press/collaboration → email.
- `ContactPage` + `Organization` JSON-LD with `PostalAddress` (`07-seo.md` §3).

## 12. `/404`

Short club-appropriate message, links to `/club` and `/club/projects`, and a link to the portal at
`/`. It must work in **both zones**: a miss under `/club/anything` and a miss at `/anything` both
land here, so its links are absolute and it uses a minimal chrome that makes sense either way.

## 13. 🟡 Draft mission copy for `/club/about`

The leader asked for this to be generated from research and the supplied facts. **Read it before
publishing** — it makes claims about the club that only the leader can verify.

> **What we are**
>
> InnoChipDesign is a student engineering community at Innopolis University. We formed in 2023
> around a simple idea: that the way to understand how a processor works is to build one. Our members
> design digital hardware — writing RTL, running it on FPGA boards, verifying it, and taking the
> better projects toward an ASIC flow.
>
> **How we work**
>
> We meet every Saturday during the spring and fall semesters. Sessions follow the Chip Design School
> curriculum run by YADRO with MIET, MFTI and ITMO — a free two-semester course covering logic design,
> state machines, FPGA architecture, pipelines, microarchitecture and functional verification. Around
> that, members build their own projects: RISC-V cores, cache and memory subsystems, audio and video
> pipelines, and a long line of games that turn out to be an excellent way to learn timing closure.
> Every project ends up here, with its source on GitHub.
>
> **Where it leads**
>
> We have sent teams to the YADRO SoC Design Challenge — an in-person RISC-V systems-on-chip hackathon
> at MIET in Zelenograd, with tracks in topological design, RTL, UVM verification, system verification
> and design-for-test — every year since 2023, and placed in 2024. Chip design is a field where
> Russia is actively building capacity, and the gap between a university course and industry work is
> mostly practice. That practice is what this club is for.

Notes on what this copy deliberately does and doesn't do:
- It states the 2024 result as "placed", not "won", because the track and placement are unverified
  (`11-club-data.md` §6). Fill in the specifics and the sentence gets stronger.
- It names the Chip Design School as a *third party's* course the club follows, matching the `/club/join`
  framing.
- It does not claim member counts, which the partial roster can't support.

Remaining `/club/about` sections: **history/timeline** (🔴 leader left blank), **leadership block**
(`officer: true` + advisor), and **awards** (blocked on §6 of the data sheet).

### Partners block (D32)

At the foot of `/club/about`:

```
Partners
We work with companies on student hardware projects.
┌──────────────────────┐ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  ADV-T               │ │                     │
│  Systems integrator  │ │  Your company       │
│  ↗ adv-t.ru          │ │  could be here      │
│                      │ │  ✉ talk to us       │
└──────────────────────┘ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- The dashed card is `mailto:`-linked to the club address.
- It renders **only when at least one real partner exists**. Alone, an invitation card reads as
  "nobody sponsors us".
- 🔴 ADV-T's legal name is **ООО «Адв-Тех»**, a Moscow full-cycle systems integrator. Confirm how
  they want to be credited — brand name, legal name, or a supplied logo — before this ships. A
  wrongly-worded credit for a company is worse than no credit.

## 14. Future i18n

If a second language is ever needed, exactly three things change: (1) `astro.config.mjs` gains an
`i18n` block and routes move under `src/pages/[lang]/`; (2) collections gain a `lang` field and a
per-language folder; (3) Pagefind is run per language with its language packs. Nothing in the
component layer assumes English beyond copy strings, which live in `src/data/site.ts` and the MDX
files. Noted so D3 stays cheap to revisit — which matters more than usual here, since the club's own
members are Russian-speaking.
