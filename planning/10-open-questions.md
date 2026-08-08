# Open Questions

Answered 2026-08-07. This file is now a **record of what was decided and what is still missing** —
it is no longer a form.

Where an answer produced a fact, that fact lives in **`11-club-data.md`**, not here.
Where an answer produced a decision, it lives in **`00-decisions.md`**, not here.

Status: `[x]` answered and propagated · `🔴` still blocking something · `🟡` I drafted something for
your approval

---

## Part 1 — Still blocking

Six items. **None of them block phases 0–4** (foundations, content model, project pages, directory) —
that is more than half the build. Ordered by when they're needed.

| # | Needed | Blocks | Latest |
|---|---|---|---|
| 1 | 🔴 **Logo as SVG, or PNG with transparency ≥ 512×512.** A JPG cannot make `favicon.svg` and gives an opaque white box in the OG template. | favicon set, OG images, header wordmark, portal cards | phase 1 |
| 2 | 🔴 **One real sentence describing VCD, and one for HW.** Currently guessed. On the portal they are the only words a visitor reads before clicking. | `/`, header, `/club/resources` | phase 5 |
| 3 | 🔴 **The equipment list itself** — name, one line, link, photo, per item (the new page, D31). | `/club/equipment` | phase 5 |
| 4 | 🟡 **Approve or rewrite the drafted mission copy** (`05` §12) and the `/club/join` framing (`05` §9). | `/club/about`, `/club/join` | phase 5 |
| 5 | 🔴 **Canonical domain** — `www.innochipdesign.ru` or the campus host (D30). `SITE_URL` bakes one into every canonical, sitemap entry and OG URL. | production build | phase 7 |
| 6 | 🔴 **2024 SoC Design Challenge: which track, which placement, which team members.** Until then `/club/about` says "placed in 2024" and the structured `awards` stay empty. | `/club/about` | phase 8 |

Two smaller things worth a decision at some point, neither blocking:

- **`m.kuskov@innopolis.university` is a person's address, not a role address.** It will outlive
  neither the person nor the role. A `club@…` alias or a shared inbox is worth requesting.
- **The three seed events I generated are invented templates**, shipped `draft: true` so they cannot
  reach production (`05` §7). Replace or delete them.

---

## Part 2 — What your answers changed

Twelve decisions were revised or added. Full text in `00-decisions.md`; this is the map from your
answer to the change.

| Your answer | Decision | Effect |
|---|---|---|
| "Make root page `/` a portal with links… to the /club itself (main link), to the VCD, to the HW" | **D15, D19** | Portal at `/`, club at `/club/*`, **one build, no Astro `base`**. Every route moved. `src/lib/routes.ts` added so the prefix exists in one file. The club card is visually primary; VCD and HW are secondary. |
| "Add additional page with Equipment… no subpages… name, short description, ref link, photo (or stub)" | **D31** | New route `/club/equipment` + an `equipment.yaml` data collection. Equipment is **removed** from `/club/resources` so it isn't in two places. |
| "no need. There is no uniform teams." | **D7, D8** | Team facet **removed** — three facets, not four. No `?team=` parameter. Names stay searchable as free text. `PersonChip`/`PersonGrid`/`AlumniList` deleted from the inventory. |
| "Switch to preact, okay" | **D11** | `@astrojs/preact` with `compat: true`. `/club/projects` JS budget cut from < 80 KB to < 30 KB; project pages from < 55 KB to < 12 KB. No component rewrites. |
| "switch to clickable preview" | **D10** | Click-to-load `VideoFacade` replaces the direct iframe. **Zero third-party requests on any route until a click** — a property worth defending, and the reason no cookie banner is needed. |
| "projects without photos should use stub (default) image" | **D21** | `cover` now optional; `ProjectCover` renders a deterministic SVG stub. `coverAlt` still required *when* a cover exists. The same stub serves the equipment page. |
| "page size is huge, 100 projects per page" | **D22** | Taken to its conclusion: **no pagination at all**. At ~20 projects growing ~8/year, page 2 arrives around 2036. `/club/projects/page/[n]` and `?page=` dropped. |
| "photo on left, details in center and right… No grid." | **D20** | `/club/projects` is a **row list**. Card grid survives only as the 3-item featured strip on `/club`. The equipment page reuses the same row. |
| "Draft, Idea, Work in progress, Completed" | **D23** | `status: idea \| in-progress \| completed \| archived`, with `draft: true` kept as a **separate** publication flag. `archived` added so a finished 2023 project can stay online without cluttering the default view. |
| "Advanced students trimesters including summer" | **D24** | `semester: spring \| fall \| summer`, optional. |
| "nobody" *(will keep the meeting banner current)* | **D26** | Dated banner dropped. A standing sentence ships instead — "every Saturday at 12:00 during the spring and fall semesters, room announced in the chat" — true for years with no maintenance. |
| "image should be clickable redirect to ya maps" | **D27** | Static map image, clickable → Yandex Maps. ⚠️ This **contradicts** your C3 answer asking for a live embed; I went with the later, more specific one, which also preserves the zero-third-party property. Overrule if you meant the embed — it's a one-component change plus a CSP entry. |
| "Everything except name should be optional" | **D8** | `name` is the only required field on a person. A valid entry can be two lines. |
| "Generate minimal set automatically" *(tags)* | **D25** | 11 tags seeded from your actual GitHub repos: fpga, asic, riscv, cpu, memory, peripherals, dsp, vision, verification, games, tools. Each with a "belongs here when…" rule so the next maintainer can extend it (`02` §3). |
| "Partner ADV-T LLC (adv-t.ru)" + "~Your company could be here~" | **D32** | Partners section on `/club/about` with one real entry, plus a dashed-outline "Your company could be here" card linking to the club email. Treated as deliberate, not a joke — see below. |

### The two you asked me to clarify

**D-g — "Lightbox state not in the URL": what was I asking?** Whether opening image 3 of a gallery
should change the address bar to `…?image=3`, so the link could be shared and Back would close the
lightbox. **Decided: no** (D28). Back-closes-overlay is a mobile-app convention browsers don't
guarantee — on desktop it navigates away and loses the page; every gallery click would add a history
entry, so leaving a project takes eight Backs; and a shared `?image=3` breaks the moment the gallery
is reordered. The shareable URL for a specific image is the "View original" link, which points at a
real file.

**D-k — "CSP report-only for one week": what is that?** A Content Security Policy is a response header
listing which origins a page may load scripts, styles, images and iframes from; the browser blocks
anything not listed. It is the main defence against an injected script on a site that embeds
third-party video. In **report-only** mode the browser *reports* violations instead of blocking them.
**Decided: report-only for one week, then enforce** (D29). Enforced on day one, one missed hash
silently breaks the theme toggle or blanks every video, with a console error most visitors never
report. A week of reports costs nothing and turns a possible outage into a log line. It's step 10 of
the release checklist.

### On "Your company could be here"

Taken at face value and specced as a real element (D32): a dashed-outline card at the end of the
partners row, `mailto:`-linked to the club address, with a line like *"We work with companies on
student hardware projects. Talk to us."*

Two honest cautions, since this is outward-facing:

- **It only reads as confident when it sits beside at least one real partner.** One real card plus
  one empty invitation is fine. An empty invitation alone reads as "nobody sponsors us".
- **The strikethrough in your answer stays out of the rendered page.** `~text~` is a joke in a
  markdown file; on a live site it reads as a mistake.

If you'd rather not have it, it's a one-component deletion — say so and it goes.

---

## Part 3 — Answers recorded, with where they went

`[x]` = fact extracted and propagated. Nothing below needs re-answering.

| Question | Your answer | Now lives in |
|---|---|---|
| A1 identity | InnoChipDesign / Innopolis Chip Design Club, Innopolis University, founded 2023 | `11` §1 |
| A1 pitch | two variants supplied | `11` §1 — first is the hero, second the footer strapline |
| A1 logo | JPG supplied later | `11` §1 🔴 blocker 1 |
| A2 domain | two domains + subpath `/club` | `11` §2, D30 |
| A3 services | `vcd.innochipdesign.ru`, `homework.innochipdesign.ru` | `11` §3, `02` §6 |
| A3 other | Telegram, email, GitHub project list | `11` §4, §7; `02` §7 |
| B1 tags | "generate minimal set" | `02` §3 — 11 tags |
| B2 volume | ~20 now, ~8/year | D22, `03` §5 |
| B3 semesters | spring/fall + summer for trimesters | D24 |
| B4 people | consent in person; removal via maintainer; only `name` required | D8, `02` §5, `11` §9 |
| B5 video host | *(blank → clarified as "mixed")* | D10 — all four providers first-class |
| C1 meetings | Saturdays 12:00, spring & fall, location TBA each time | D26, `11` §5 |
| C2 join | YADRO Chip Design School form + Telegram; everyone welcome | `11` §5, `05` §9 ⚠️ third-party form |
| C3 contact | address, advisor Mikhail Kuskov, map | `11` §4, D27 |
| C4 events | "nobody" keeps the banner; generate 3 examples | D26, `05` §7 (all `draft: true`) |
| C5 resources | *(equipment now has its own page — D31)* | `02` §8, `05` §9 🔴 blocker 3 |
| C6 about | "generate based on websearch"; SoC Design Challenge 2023–26, prizes 2024 | `05` §12 🟡, `11` §6 🔴 blocker 6 |
| C6 partners | ADV-T LLC (adv-t.ru) + open invitation | D32, `11` §6 |
| F | portal at `/`; new equipment page | D19, D31 |

### What the research turned up

Five things worth knowing that weren't in your answers:

1. **The application form isn't yours.** `engineer.yadro.com/chip-design-school/` is YADRO's *School
   of Digital Circuit Synthesis* — a free two-semester course built on an MIT course, taught by staff
   from MIET, MFTI and ITMO, delivered online or at partner university clusters. Your club is
   evidently one of those clusters. So `/club/join`'s primary CTA sends people to a **third party's
   program signup**, not a club membership form. The page has to say that or visitors will be
   confused. Proposed wording in `05` §9. 🔴 Confirm.
2. **SoC Design Challenge, verified:** run by YADRO **with MIET**, held at MIET in Zelenograd; teams
   of 2–3 full-time students from Russia and Belarus; tracks are Topological Design, RTL Design, UVM
   Verification, System Verification and DFT Structures; the 2024 edition drew 260+ participants from
   16 cities; 2026 ran 24–26 April. All safe to publish. Your placement is not — hence blocker 6.
3. **ADV-T:** legal name **ООО «Адв-Тех»**, a full-cycle systems integrator in Moscow (Mitinskaya 16),
   ~20 years in IT services, serving government, telecoms, chemical manufacturing and retail. Recorded
   in `11` §6. Confirm how they want to be credited — the Russian legal name, "ADV-T", or a logo.
4. **Your GitHub org has 24 repos**, ~15 of them club projects — enough to seed the whole directory
   without waiting for anyone to write new content. Listed with suggested tags in `11` §7. Note
   `student-projects` already duplicates this list; once the site is live it should link here rather
   than be maintained in parallel.
5. **Seven of those fifteen are games.** Fine — games are how people learn RTL — but spread
   `featured: true` across riscv / memory / dsp / vision so the first screen doesn't read as a games
   list.

---

## Part 4 — Kept as you decided

For the record, and so nobody "improves" them later. These were in section D and you marked them
KEEP:

- `MobileNav` is not an island — inline script, so the framework stays off 9 of 11 routes.
- Controlled tag vocabulary, build-time validated.
- Homepage stats derived from content, never typed. *(With one addition: **no member count** — the
  roster is deliberately partial under D8, so a derived count would understate the club and a typed
  one would be fiction.)*
- `Contact` in the footer, not the header.
- Light theme default, dark as a toggle.
- `draft: true` projects get no URL at all.

And the three reversals of your original brief, still standing: Pagefind instead of Fuse.js, Caddy
instead of nginx, and — now partially un-reversed — **all four video providers** rather than one.
