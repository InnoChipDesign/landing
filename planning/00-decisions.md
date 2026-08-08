# Decision Log

Status: **agreed** unless marked otherwise. Every decision below was made explicitly by the club leader
during planning. This file is the source of truth — if another document contradicts it, this file wins.

Planning session: 2026-08-07 · revised 2026-08-07 after the leader's answers in `10-open-questions.md`.

Club-specific facts (names, URLs, addresses, dates) are **not** in this file. They live in
`11-club-data.md`, which is the only place they may be edited.

---

## D1 — Framework: Astro 7, static output

`output: 'static'`. No SSR adapter, no server runtime. The build produces a `dist/` folder of
plain HTML/CSS/JS that any file server can host.

## D2 — Theme: AstroWind as visual/structural base

MIT-licensed, Tailwind-based, the most-forked Astro theme. We take its layout primitives, SEO head
handling and widget blocks, then replace the palette and typography with our own tokens (see
`06-design-system.md`). We do **not** vendor the whole theme wholesale — we lift the pieces we use.

> Risk accepted: AstroWind's look is recognizable. Mitigated by a distinct palette, type pairing and
> our own project-row / filter components, which are the pages visitors spend the most time on.

## D3 — Language: English only

**Reverses an earlier bilingual/quad-lingual direction.** No i18n routing, no locale prefixes, no
translation fallback logic, no RTL. `<html lang="en" dir="ltr">`.

> Consequence: this removes an estimated 30–40% of the total build effort. If a second language is
> ever needed, `05-sitemap-and-pages.md` §"Future i18n" notes the three places that would change.
>
> Worth restating given the club is Russian-speaking: the audience for a *public* chip-design club
> page is substantially international (recruiters, RISC-V community, exchange applicants), and a
> single well-written English site beats two half-maintained ones. Revisit only if the club's own
> members can't read it.

## D4 — Content model: MDX per project via Content Collections

One folder per project under `src/content/projects/<slug>/`, containing `index.mdx` plus its images.
Zod-validated frontmatter. Type-safe, git-reviewable, no CMS service to operate.

## D5 — Project detail: dedicated prerendered page per project

`/club/projects/<slug>` is a real static HTML document. Required for SEO, for shareable links, for
per-project OG images, and it is what Pagefind indexes.

## D6 — Search: Pagefind, no Fuse.js

**Reverses the original "use Fuse.js, keep a migration path to Pagefind" requirement.** Going
straight to Pagefind avoids building the same feature twice, and Pagefind ships chunked indexes that
are fetched on demand rather than a single JSON blob every visitor downloads.

Consequences, accepted:
- Pagefind indexes **built HTML**, so anything that must be searchable has to be rendered into the page
  (visibly or via `data-pagefind-*` attributes). See `03-search-and-filtering.md`.
- Pagefind artifacts do not exist during `astro dev`. A documented dev workflow covers this.

## D7 — Facets: tags, year/semester, status *(revised — three facets, not four)*

**The team-member facet is removed.** The leader's reasoning: *"There is no uniform teams. Team is
just a collection of its participants and each team unique to the project."* A facet whose values are
almost all single-use produces a dropdown of ~40 names each matching one project — noise, not
navigation.

Filter dimensions are therefore **tags · year (+ semester) · status**, plus the free-text query. All
synced to the URL query string.

Member names remain **searchable as text** (they are inside the indexed body), so typing a name still
finds that person's projects. What's gone is the dedicated facet control and the `?team=` parameter.

## D8 — People: `people.yaml` data collection, **no person pages**

Members live in one YAML file. They appear as credit lines on project pages and as a short leadership
block. No `/team/<slug>` routes are generated, and — following D7 — **no `?team=` filter links**;
a person's name renders as plain text or as their own external link, not as a site filter.

**Roster scope: project authors + club officers/instructor.** Not a full membership list.
**Only `name` is required**; every other field is optional, so the minimum-consent case is the
default path. Consent is recorded in person by the leader (`11-club-data.md` §9).

## D9 — Images: optimized variants inline, original behind an explicit download link

Originals are committed to the repo alongside the project. The build emits AVIF/WebP responsive
variants for the page, a ~2000px "large" variant for the lightbox, and copies the untouched original
into `dist/originals/` so the lightbox can offer **"View original (12 MB)"** with the size stated.

## D10 — Video: all four providers supported, click-to-load facade *(revised twice)*

- **Providers:** the earlier "single provider at a time" narrowing is **withdrawn**. The host is not
  fixed and may differ per project, so YouTube, Rutube, VK Video and Dzen are all first-class in
  `src/lib/video.ts`. This returns to the original brief.
- **Loading:** direct iframes are **replaced by a click-to-load facade** (E2). A poster image plus a
  play button; the iframe is injected on click. Until a visitor clicks, the site makes **zero**
  third-party requests on any page.

Consequence: the CSP `frame-src` is generated from the set of providers actually referenced by
published content, so it stays narrow without manual maintenance (`08-deployment.md` §6).

## D11 — Islands: Preact via `@astrojs/preact` *(revised — was React)*

Same component model, ~4 KB runtime instead of ~45 KB. Two islands exist; everything else is zero-JS
Astro. `preact/compat` is aliased so any React-shaped snippet a contributor pastes in still works.

## D12 — SEO: core meta + generated OG images + JSON-LD

Sitemap, robots, canonical, Open Graph/Twitter, a build-time 1200×630 OG image per project, and
Schema.org JSON-LD (`Organization`, `CreativeWork`, `SoftwareSourceCode`, `VideoObject`, `Person`,
`Event`). **No RSS feed** (not selected).

## D13 — Analytics: none

No tracking scripts, no cookies, no consent banner. Visit counts, if ever wanted, come from the web
server's access log analyzed locally.

## D14 — Serving: Caddy in a multi-stage Docker build

**Reverses the original nginx requirement.** The site sits **behind an existing university reverse
proxy** that terminates TLS, so our container serves plain HTTP on an internal port — but the
`Caddyfile` is env-driven so the same image can also self-terminate TLS on a public domain without a
rebuild.

## D15 — Pages *(revised — portal at the root, club under `/club`)*

| Route | Purpose |
|---|---|
| `/` | **Portal** — grid of the club's web properties |
| `/club` | Club home — showcase-first |
| `/club/projects` | Searchable, filterable directory |
| `/club/projects/<slug>` | Project detail |
| `/club/about` | Mission, history, faculty, competition record, partners |
| `/club/events` | Simple reverse-chronological list |
| `/club/equipment` | Lab equipment available for projects (D31) |
| `/club/resources` | Learning links and guides **+ "Services built by us"** |
| `/club/join` | How to join |
| `/club/contact` | Channels, location |
| `/404` | Not found |

No `/team`, no `/team/<slug>`, no `/news`, no `/services` page, no `/club/projects/page/[n]` (D22).

**Implemented as `src/pages/club/…`, not `base: '/club'`** — the build has to own `/` as well.
Rationale in `11-club-data.md` §2.

## D16 — Header carries two external service buttons

The two flagship club services (**VCD** → `vcd.innochipdesign.ru`, **HW** →
`homework.innochipdesign.ru`) are external-link buttons in the top bar of every `/club/*` page. They
come from `services.yaml` entries flagged `inHeader: true`; a build assertion caps that at two.

The **portal at `/`** shows the same services as large cards alongside a card for the club site
itself. The header buttons and the portal are two views of one data file.

## D17 — Club homepage order

Showcase → what we do → mission + derived stats → team → join CTA.

## D18 — Join flow: external form + chat

Primary CTA links to a hosted form; secondary CTA is the group chat. No backend, no self-hosted form
service. **Caveat:** the supplied form belongs to a third party (YADRO's Chip Design School), so
`/club/join` must explain what the visitor is signing up for — `11-club-data.md` §5.

---

## Decisions added after the leader's answers

## D19 — Root portal is part of this build

`src/pages/index.astro` renders a grid of cards from `services.yaml` (`onPortal: true`): the club
site plus every external property. It uses the same tokens and chrome primitives but has **no
header nav and no footer nav** — it is a switchboard, not a page. Zero JS.

## D20 — Project directory is a **row list**, not a card grid

Leader's instruction: *"a list of projects with photo on left and project details in center and
right. With margins on sides. No grid."* Full-width rows, thumbnail left, title/summary/meta right.
This also suits the real data: ~20 projects with heterogeneous cover images, where a grid would
amplify inconsistency and a row list absorbs it. Applies to `/club/projects`; the club homepage
featured strip keeps its three-card row.

## D21 — Cover image optional, with a shared default

**Reverses "cover is required".** Leader: *"projects without photos should use stub (default) image,
everything should look uniform."* A generated placeholder — club mark on a tinted surface, tint
derived deterministically from the slug — renders when `cover` is absent. Uniform, and nobody is
blocked from publishing a project because they lack a photo.

## D22 — No pagination

At ~20 projects growing by ~8/year, a page-size of 100 is reached around 2036. The whole list is
server-rendered on one page (`content-visibility: auto` keeps it cheap), `/club/projects/page/[n]`
is dropped, and the `?page=` URL parameter is dropped. Revisit past ~150 projects.

## D23 — Project status vocabulary

`status: idea | in-progress | completed | archived`, and the separate boolean `draft: true` keeps its
distinct meaning of *not published — no URL, not in the index*. Two different axes: what the project
is, and whether the page is public. Merging them is how a half-written page ends up shared.

## D24 — Semester vocabulary

`semester: spring | fall | summer`, optional. Basic track uses spring/fall; advanced students run
trimesters, which adds summer.

## D25 — Controlled tag vocabulary, seeded from the club's real repositories

11 tags covering FPGA, ASIC, RISC-V, CPU, memory, peripherals, DSP, vision, verification, games and
tooling (`02-content-model.md` §3). Build-time validated. Leader's instruction was to generate a
minimal set now and refine later, which the controlled vocabulary makes a one-file edit.

## D26 — No dated "next meeting" banner

The leader answered "nobody" to who would keep it current. What ships is a **standing recurrence
sentence** ("every Saturday at 12:00 during the spring and fall semesters, room announced in the
chat") that stays true without maintenance. A stale date makes a site look abandoned; this does not.

## D27 — Contact map is a clickable static image

Not a live embed. Preserves "no third-party requests except a clicked video" and needs no CSP
widening. Opens Yandex Maps in a new tab. The conflicting answers are recorded in
`11-club-data.md` §4 — overruling this is a one-component change.

## D28 — Lightbox state stays out of the URL *(was "needs clarification")*

**What was being asked:** whether opening image 3 of a gallery should change the address bar to
`…?image=3`, so that URL could be shared and the browser Back button would close the lightbox.

**Decision: no.** Reasons: (1) Back closing an overlay is a mobile-app convention that browsers don't
guarantee — on desktop it navigates away instead, losing the page; (2) it means every gallery click
writes a history entry, so leaving a project takes eight Backs; (3) a shared `?image=3` link is
fragile — reorder the gallery and it points at a different photo. Deep-linking a specific image is
served by the "View original" link, which is a permanent URL to an actual file.

Cost to reverse: contained to the `Lightbox` island.

## D29 — CSP ships report-only for one week, then enforced *(was "needs clarification")*

**What CSP is:** a response header listing which origins the page may load scripts, styles, images
and iframes from. A browser blocks anything not listed. It is the main defence against an injected
script on a site that embeds third-party video.

**Why report-only first:** in `Content-Security-Policy-Report-Only` mode the browser *reports*
violations instead of blocking them. Ship enforced on day one and a single missed hash silently
breaks the theme toggle or blanks every video, with a console error most visitors never report.
One week of reports costs nothing and converts a possible outage into a log line.

**Concretely:** launch with the report-only header; check the browser console on `/`, `/club`, a
project page with a video, and `/club/contact`; then flip the header name. Recorded as step 8 of the
release checklist (`08-deployment.md` §8).

## D31 — Dedicated `/club/equipment` page

Leader: *"Add additional page with 'Equipment' available in our university lab for working on
projects. The page does not assume subpages and should only include name, short description, ref
link, photo (or stub)."*

- New route `/club/equipment`, backed by `src/data/equipment.yaml`. **No detail pages** — the same
  shape as `people` (data collection, zero generated routes).
- Fields: `name` (required), `description` (one line), `link` (optional), `photo` (optional).
- Renders with the **same row component as the project directory** (D20): photo left, name and
  description right, `ProjectCover`'s stub when there is no photo (D21).
- **Equipment is removed from `/club/resources`.** It was a section there in the earlier plan; two
  homes for one list is how they diverge. `/club/resources` keeps links, guides and the services
  section.
- Not searched, not filtered, not paginated. A lab inventory is read top to bottom.
- Header nav is now 6 items + 2 service buttons, which is at the limit — see `05` §3 for how it is
  handled.

## D32 — Partners section with an open invitation

Leader: *"Partner ADV-T LLC (https://adv-t.ru)"* plus *"~Your company could be here~"*.

A partners row at the foot of `/club/about`: one card per real partner, followed by a
dashed-outline card reading "Your company could be here", `mailto:`-linked to the club address.
Taken as a deliberate solicitation, not a joke — a hardware club with lab costs has a real reason to
ask.

Two constraints: the invitation card only ships **alongside at least one real partner** (alone it
reads as "nobody sponsors us"), and the strikethrough from the source answer does not reach the page.
Partner data lives in `site.ts` (`11-club-data.md` §10). ADV-T's legal name is ООО «Адв-Тех»; how
they wish to be credited is still to be confirmed.

## D30 — Canonical domain: **unresolved, blocking the first production build**

Two domains were supplied (`www.innochipdesign.ru` and
`innochipdesign.campus.innopolis.university`). `SITE_URL` bakes one of them into every canonical tag,
sitemap entry and OG URL. Recommendation and the redirect approach: `11-club-data.md` §2. This is
the only phase-7 blocker.

---

## Reversals summary

Requirements and earlier decisions deliberately overridden. Recorded so nobody "fixes" them back.

| Original | Final | Reason |
|---|---|---|
| Use Fuse.js, allow migration to Pagefind | Pagefind only (D6) | Avoids building search twice |
| Deploy with nginx | Caddy (D14) | Simpler config, optional auto-TLS |
| Multi-provider video embedding | *(briefly)* single provider → **back to all four** (D10) | Host isn't fixed; may differ per project |
| Direct video iframes | Click-to-load facade (D10) | Zero third-party requests until a click |
| React islands | Preact (D11) | ~4 KB vs ~45 KB, no component rewrites |
| Four facets incl. team member | Three facets (D7) | Teams are per-project; the facet was noise |
| `cover` required on every project | Optional + default stub (D21) | Nobody blocked on lacking a photo |
| Pagination at 24/page | No pagination (D22) | ~20 projects; the machinery outweighed the need |
| Site rooted at `/` | Portal at `/`, club at `/club` (D15/D19) | The domain hosts several club properties |
| RU/EN/ZH/AR | English only (D3) | Withdrawn by the leader for simplicity |
