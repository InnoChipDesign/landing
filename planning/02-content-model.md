# Content Model

All content is files in the repository. Adding content is a git commit; no service, no database.

Club-specific values (names, URLs, people) come from `11-club-data.md`. This document defines the
*shape*; that one supplies the *values*.

## 1. Collections overview

| Name | Type | Location | Generates pages? |
|---|---|---|---|
| `projects` | content (MDX) | `src/content/projects/<slug>/index.mdx` | yes → `/club/projects/<slug>` |
| `events` | content (MDX) | `src/content/events/<slug>.mdx` | no (rendered inline on `/club/events`) |
| `pages` | content (MDX) | `src/content/pages/<name>.mdx` | no (imported by fixed routes) |
| `people` | data (YAML) | `src/data/people.yaml` | **no** — D8 |
| `tags` | data (YAML) | `src/data/tags.yaml` | no (controlled vocabulary) |
| `services` | data (YAML) | `src/data/services.yaml` | no (portal + header + `/club/resources`) |
| `resources` | data (YAML) | `src/data/resources.yaml` | no (section on `/club/resources`) |
| `equipment` | data (YAML) | `src/data/equipment.yaml` | **no** — one flat page, D31 |

## 2. `src/content.config.ts`

```ts
import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/** D23 — what the project IS. Publication is the separate `draft` flag. */
const STATUS = ['idea', 'in-progress', 'completed', 'archived'] as const;

/** D24 — basic track: spring/fall. Advanced students run trimesters, hence summer. */
const SEMESTER = ['spring', 'fall', 'summer'] as const;

const projects = defineCollection({
  loader: glob({ pattern: '**/index.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(70),
      summary: z.string().min(40).max(200),      // cards, meta description, OG image

      // D21 — optional. A deterministic stub is rendered when absent, so the
      // list stays uniform and nobody is blocked on lacking a photo.
      cover: image().optional(),
      coverAlt: z.string().min(5).optional(),

      year: z.number().int().min(2015).max(2100),
      semester: z.enum(SEMESTER).optional(),
      status: z.enum(STATUS),

      tags: z.array(z.string()).min(1).max(6),   // must exist in tags.yaml — checked at build
      featured: z.boolean().default(false),
      order: z.number().default(0),              // manual tie-break within a year

      // Free-text credit lines. `person` is optional: a one-off contributor can be
      // credited by name without an entry in people.yaml.
      team: z
        .array(
          z.object({
            person: reference('people').optional(),
            name: z.string().optional(),
            role: z.string().optional(),
          }),
        )
        .default([]),

      // D10 — provider is parsed at build time from the URL; any of the four is fine,
      // and different projects may use different hosts.
      video: z.string().url().optional(),
      videoTitle: z.string().optional(),
      videoPoster: image().optional(),           // facade thumbnail; falls back to `cover`

      gallery: z
        .array(z.object({ src: image(), alt: z.string().min(5), caption: z.string().optional() }))
        .default([]),

      links: z
        .object({
          repo: z.string().url().optional(),
          docs: z.string().url().optional(),
          paper: z.string().url().optional(),
          poster: z.string().url().optional(),
          demo: z.string().url().optional(),
        })
        .default({}),

      awards: z
        .array(z.object({ title: z.string(), event: z.string().optional(), year: z.number().optional() }))
        .default([]),
      stack: z.array(z.string()).default([]),     // "SystemVerilog", "Vivado", "Verilator"
      hardware: z.array(z.string()).default([]),  // "Basys 3", "Tang Nano 9K"

      draft: z.boolean().default(false),          // excluded from build output entirely
      updated: z.coerce.date().optional(),
    })
    .refine((d) => !d.cover || !!d.coverAlt, {
      message: 'coverAlt is required whenever cover is set',
      path: ['coverAlt'],
    }),
});

const people = defineCollection({
  loader: file('./src/data/people.yaml', { parser: (t) => parseYamlArray(t) }),
  schema: ({ image }) =>
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string(),                          // ← the ONLY required field (D8)
      role: z.string().optional(),               // "Instructor", "RTL", "Verification"
      officer: z.boolean().default(false),       // shown in the leadership block
      photo: image().optional(),
      years: z.array(z.number().int()).default([]),
      alumni: z.boolean().default(false),
      links: z
        .object({
          github: z.string().url().optional(),
          site: z.string().url().optional(),
          telegram: z.string().url().optional(),
        })
        .default({}),
    }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/events' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      location: z.string().optional(),
      kind: z.enum(['meeting', 'workshop', 'competition', 'demo-day', 'other']).default('other'),
      cover: image().optional(),
      link: z.string().url().optional(),
      draft: z.boolean().default(false),
    }),
});

const equipment = defineCollection({
  loader: file('./src/data/equipment.yaml', { parser: (t) => parseYamlArray(t) }),
  schema: ({ image }) =>
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string(),                          // ← the only required field besides id
      description: z.string().max(160).optional(),
      link: z.string().url().optional(),         // vendor page, datasheet, or booking form
      photo: image().optional(),                 // stub renders when absent (D21)
      photoAlt: z.string().min(5).optional(),
      category: z.string().optional(),           // free text — "FPGA boards", "Instruments"
      order: z.number().default(0),
    })
    .refine((d) => !d.photo || !!d.photoAlt, {
      message: 'photoAlt is required whenever photo is set',
      path: ['photoAlt'],
    }),
});

export const collections = {
  projects, people, events, equipment, /* pages, tags, services, resources */
};
```

### Why these constraints

- `summary` is length-bounded because it is reused as the meta description and inside the generated
  OG image; unbounded text breaks both.
- `cover` is **optional** (D21) but `coverAlt` is required *whenever a cover exists* — enforced by the
  `.refine()`. A missing alt is an accessibility failure the build should not permit; a missing photo
  is not.
- `tags` capped at **6**, not 8. With an 11-tag vocabulary, a project carrying 8 of them is
  categorising nothing.
- `team[].person` is optional so a guest contributor can be credited by `name` alone without being
  added to `people.yaml` — the minimum-consent path (D8). When `person` **is** given,
  `reference('people')` makes a typo'd id a build error rather than a silently missing credit.
- `draft: true` entries are filtered out in every query *and* excluded from `getStaticPaths`, so a
  draft never gets a URL and never enters the search index. This is a different axis from
  `status: idea` — see D23.

### Build-time assertions — `src/lib/validate.ts`

Called from the `astro:config:done` hook. Every message names the offending file.

| Assertion | Failure message shape |
|---|---|
| every `tags[]` value exists in `tags.yaml` | `projects/foo/index.mdx: unknown tag "fpgaa" (did you mean "fpga"?)` |
| every `video` URL parses to a known provider | `projects/foo/index.mdx: unrecognised video host "vimeo.com"` |
| at most 2 services with `inHeader: true` | `services.yaml: 3 services flagged inHeader, maximum is 2` |
| every `onPortal` service has `name` + `url` | `services.yaml: "hw" is on the portal but has no url` |
| no two projects share a slug-derived OG filename | `projects: duplicate og slug "rover"` |
| `featured: true` count ≥ 3 or 0 | warn only — the homepage falls back to newest-3 |

## 3. Controlled tag vocabulary

`src/data/tags.yaml`. Seeded from the club's actual repositories (`11-club-data.md` §7), which is
why it is a hardware taxonomy and not a generic one. Refine it once real projects are entered — with
a controlled vocabulary that is a one-file edit plus whatever build errors it surfaces.

```yaml
- id: fpga
  label: FPGA
  color: blue
- id: asic
  label: ASIC
  color: violet
- id: riscv
  label: RISC-V
  color: teal
- id: cpu
  label: CPU & Microarchitecture
  color: indigo
- id: memory
  label: Memory & Cache
  color: cyan
- id: peripherals
  label: Peripherals & Interfaces
  color: sky
- id: dsp
  label: Signal & Audio
  color: amber
- id: vision
  label: Image & Video
  color: rose
- id: verification
  label: Verification
  color: emerald
- id: games
  label: Games & Demos
  color: fuchsia
- id: tools
  label: Tooling & EDA
  color: slate
```

Rationale for each, so the next maintainer knows what belongs where:

| Tag | Belongs here when the project's *subject* is… |
|---|---|
| `fpga` | targeted at an FPGA board (most club projects) |
| `asic` | an ASIC flow — synthesis, place & route, tapeout-oriented |
| `riscv` | a RISC-V core or the RISC-V ISA specifically |
| `cpu` | pipelines, hazards, branch prediction, microarchitecture generally |
| `memory` | caches, memory controllers, banking, DRAM |
| `peripherals` | UART, SPI, I²C, VGA/HDMI, USB, GPIO |
| `dsp` | audio, filters, FFT, signal processing |
| `vision` | image or video processing, edge detection, camera pipelines |
| `verification` | testbenches, UVM, formal, coverage — verification is the point, not a side effect |
| `games` | a game or graphical demo is the deliverable |
| `tools` | scripts, generators, EDA flows, teaching infrastructure |

Keep the list **under ~15**. If it grows past that, the taxonomy is wrong and needs a second
dimension, not more tags.

> A note on the current distribution: seven of the fifteen known repos are games. That is a healthy
> way to learn RTL, but the directory must not read as a games list — spread `featured: true` across
> `riscv`, `memory`, `dsp` and `vision`.

## 4. Example project entry

`src/content/projects/school-riscv/index.mdx`:

```mdx
---
title: schoolRISCV — a teaching CPU, step by step
summary: A minimal RISC-V core built one stage at a time, from a single-cycle datapath to a pipelined implementation, used as the club's introduction to microarchitecture.
cover: ./cover.jpg
coverAlt: The core running on a Basys 3 board with the seven-segment display showing a test value
year: 2024
semester: fall
status: completed
tags: [riscv, cpu, fpga]
featured: true
team:
  - { person: m-kuskov, role: Instructor }
  - { name: Guest contributor, role: Pipeline stage }
video: https://rutube.ru/video/0000000000000000000000000000000/
videoTitle: schoolRISCV executing a test program on the board
gallery:
  - { src: ./datapath.png, alt: Block diagram of the single-cycle datapath, caption: Single-cycle datapath }
  - { src: ./board.jpg,   alt: The Basys 3 board wired to a logic analyzer }
links:
  repo: https://github.com/InnoChipDesign/project-schoolRISCV
stack: [SystemVerilog, Vivado, Verilator]
hardware: [Digilent Basys 3]
---

## The problem

…

## How it works

…

## Results

…
```

### Authoring rules

- Folder name **is** the slug and **is** permanent — it appears in the URL and in shared links.
  Lowercase, hyphens, no year suffix unless the project genuinely recurs annually. Note the slug does
  **not** have to match the GitHub repo name; prefer a readable slug (`school-riscv`, not
  `project-schoolRISCV`).
- Images live next to `index.mdx`, committed at original resolution. Do not pre-resize them; the
  build does that (see `04-media.md`).
- Body uses `##` and `###` only — `#` is reserved for the page title rendered by the layout.
- Suggested body sections: **The problem → How it works → What we built → Results → What's next**.
  Not enforced, but `templates/project/index.mdx` ships with them as commented headings.
- A project with no photos and no video is still publishable: omit `cover`, `gallery` and `video`.
  The stub cover renders and the layout closes the gaps.

## 5. `people.yaml`

```yaml
# Only `name` is required. Add a field only when the person has agreed to it
# being public — see 11-club-data.md §9.

- id: m-kuskov
  name: Mikhail Kuskov
  role: Senior Instructor
  officer: true
  years: [2023, 2024, 2025, 2026]
  links: { telegram: https://t.me/InnoChipDesign }

# Minimum-consent example — this is a complete, valid entry:
- id: a-student
  name: A. Student
```

Rendering rules (D7/D8 — **no person pages, no `?team=` filter**):

- On a project page: a credit line `Mikhail Kuskov · Instructor`. If the person has a `links.github`
  or `links.site`, the name links there; otherwise it is **plain text**. It is never a site filter —
  the team facet was removed because teams are per-project (D7).
- On `/club/about`: a short **leadership block** listing `officer: true` people, plus the faculty
  advisor. There is no full-membership grid and no alumni page (roster scope, D8).
- `photo` is optional; where a photo is used, fall back to a generated initials avatar so a row of
  people stays even.

**Privacy note:** this is a public page listing real students. Only include a person after they agree,
list only what they agree to, and honour removal requests promptly. The schema makes every field
except `name` optional for exactly this reason. Consent is recorded in person by the club leader, and
removal is actioned by the instructor or maintainer as a repository change (`11-club-data.md` §9).

## 6. `services.yaml`

Drives three surfaces from one file: the portal grid at `/`, the two header buttons on every
`/club/*` page (D16), and the "Services built by us" section on `/club/resources`.

```yaml
- id: club
  name: The Club
  tagline: Projects, events and how to join.
  url: /club
  kind: internal
  status: live          # live | beta | retired
  onPortal: true
  inHeader: false

- id: vcd
  name: VCD
  tagline: <one real sentence — see 11-club-data.md §3>
  url: https://vcd.innochipdesign.ru
  kind: external
  status: live
  onPortal: true
  inHeader: true
  screenshot: ./services/vcd.png    # optional

- id: hw
  name: HW
  tagline: <one real sentence — see 11-club-data.md §3>
  url: https://homework.innochipdesign.ru
  kind: external
  status: live
  onPortal: true
  inHeader: true
  screenshot: ./services/hw.png
```

- `inHeader: true` is what puts a service in the header. The header has **no hardcoded links**;
  promoting a third service is a data change — but a build assertion caps it at two, because three
  breaks the header layout.
- `kind: external` drives `target="_blank" rel="noopener noreferrer"` and the ↗ glyph everywhere the
  service is rendered, in one place rather than three.
- `status: retired` renders greyed but still listed on `/club/resources` — retired work is part of
  the club's record — and is excluded from the portal and the header.

## 7. `equipment.yaml` (D31)

Backs `/club/equipment`. A flat list — **no detail pages, no search, no filters, no pagination**. A
lab inventory is read top to bottom.

```yaml
# 🔴 Placeholder rows. The real list is still to be supplied.
- id: basys-3
  name: Digilent Basys 3
  description: Artix-7 FPGA board with switches, seven-segment display and VGA out. The club's default board.
  link: https://digilent.com/reference/programmable-logic/basys-3/start
  photo: ./equipment/basys-3.jpg
  photoAlt: A Basys 3 board with its USB cable attached
  category: FPGA boards
  order: 10

- id: logic-analyzer
  name: Logic analyzer
  description: 8-channel USB logic analyzer for debugging bus timing.
  category: Instruments
  order: 20
  # no link, no photo — a valid entry; the stub renders
```

Rules:

- `name` is the only thing a row needs. Everything else is optional, so an item can be listed the
  moment somebody remembers it exists — the alternative is a page that never gets written.
- `category` groups rows under headings when present; ungrouped items render first under no heading.
  It is free text, deliberately: a lab inventory doesn't need a controlled vocabulary the way a
  navigational facet does.
- `link` is whatever is most useful — vendor page, datasheet, or a booking form. It is not required
  to be one kind of thing.
- **Booking is not modelled.** How to borrow something is one sentence at the top of the page, not a
  field on every row. If borrowing rules ever differ per item, add a `booking` field then.

`ProjectCover`'s stub (D21) is reused for photo-less rows, so the page stays uniform — same reason,
same component.

## 8. `resources.yaml`

🔴 Curated links were left blank (C5). The structure below is ready; the rows are placeholders and
`/club/resources` should ship with only the sections that have real content.

**Equipment is no longer here** — it moved to its own page and its own file (D31). Two homes for one
list is how they diverge.

```yaml
- section: Getting started
  items:
    - title: Chip Design School (YADRO / MIET)
      url: https://engineer.yadro.com/chip-design-school/
      note: The free two-semester course our Saturday sessions follow.
    - title: SoC Design Challenge
      url: https://edu.yadro.com/soc-design-challenge/
      note: The annual RISC-V hackathon we send teams to.

- section: Club repositories
  items:
    - title: InnoChipDesign on GitHub
      url: https://github.com/InnoChipDesign
      note: Every project's source lives here.

- section: Guides & templates        # 🔴 to be supplied
  items: []
```

An empty `items: []` section renders nothing at all — no "coming soon" heading. A visibly empty
section is worse than an absent one.

## 9. Content lifecycle

| Task | Who | How |
|---|---|---|
| Add a project | any member | copy `templates/project/`, fill frontmatter, add images, open a PR |
| Add a person | leader | append to `people.yaml` — after in-person consent |
| Remove a person | leader / maintainer | delete the entry; replace credits with `name` only or drop them |
| Add an event | leader | new file in `src/content/events/` |
| Add equipment | any member | append to `equipment.yaml` — `name` alone is enough |
| Retire a project | leader | set `status: archived` — never delete; the URL must keep working |
| Change the tag vocabulary | leader | edit `tags.yaml`, then fix the build errors it surfaces |
| Add / promote a service | leader | edit `services.yaml`; header cap of 2 is enforced |

A `templates/project/` folder with a commented `index.mdx` and a `CONTRIBUTING.md` section removes
most of the friction for students who have never written frontmatter. Given ~8 new projects a year
from rotating students, this template is load-bearing, not documentation polish.
