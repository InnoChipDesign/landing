# Content Model

All content is files in the repository. Adding content is a git commit; no service, no database.

## 1. Collections overview

| Name | Type | Location | Generates pages? |
|---|---|---|---|
| `projects` | content (MDX) | `src/content/projects/<slug>/index.mdx` | yes → `/projects/<slug>` |
| `events` | content (MDX) | `src/content/events/<slug>.mdx` | no (rendered inline on `/events`) |
| `pages` | content (MDX) | `src/content/pages/<name>.mdx` | no (imported by fixed routes) |
| `people` | data (YAML) | `src/data/people.yaml` | **no** — decision D8 |
| `services` | data (YAML) | `src/data/services.yaml` | no (section on `/resources`) |
| `resources` | data (YAML) | `src/data/resources.yaml` | no (section on `/resources`) |

## 2. `src/content.config.ts`

```ts
import { defineCollection, reference, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const STATUS = ['active', 'completed', 'archived', 'seeking-members'] as const;

const projects = defineCollection({
  loader: glob({ pattern: '**/index.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(70),
      summary: z.string().min(40).max(200),      // used on cards, meta description, OG image
      cover: image(),                             // required — no card may be image-less
      coverAlt: z.string().min(5),

      year: z.number().int().min(2000).max(2100),
      semester: z.enum(['spring', 'fall']).optional(),
      status: z.enum(STATUS),

      tags: z.array(z.string()).min(1).max(8),    // must exist in tags.yaml, checked at build
      featured: z.boolean().default(false),
      order: z.number().default(0),               // manual tie-break within a year

      team: z
        .array(z.object({ person: reference('people'), role: z.string().optional() }))
        .default([]),

      video: z.string().url().optional(),          // single canonical demo video
      videoTitle: z.string().optional(),

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

      awards: z.array(z.object({ title: z.string(), year: z.number().optional() })).default([]),
      stack: z.array(z.string()).default([]),      // "ROS 2", "PyTorch", "KiCad"
      hardware: z.array(z.string()).default([]),

      draft: z.boolean().default(false),           // excluded from build output entirely
      updated: z.coerce.date().optional(),
    }),
});

const people = defineCollection({
  loader: file('./src/data/people.yaml', { parser: (t) => parseYamlArray(t) }),
  schema: ({ image }) =>
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      name: z.string(),
      role: z.string().optional(),                 // "Hardware lead", "Member"
      photo: image().optional(),
      years: z.array(z.number().int()).default([]),
      alumni: z.boolean().default(false),
      showOnHome: z.boolean().default(false),
      links: z.object({ github: z.string().url().optional(), site: z.string().url().optional() }).default({}),
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

export const collections = { projects, people, events, /* pages, services, resources */ };
```

### Why these constraints

- `summary` is length-bounded because it is reused as the meta description and inside the generated
  OG image; unbounded text breaks both.
- `cover` and `coverAlt` are **required**. A directory where some cards have images and some don't
  looks broken, and a missing alt is an accessibility failure the build should not permit.
- `tags` are validated against a controlled vocabulary (below) so the facet list stays clean.
- `team` uses `reference('people')`, so a typo in a person id **fails the build** instead of silently
  producing an unfilterable project.
- `draft: true` entries are filtered out in every query *and* excluded from `getStaticPaths`, so a
  draft never gets a URL and never enters the search index.

## 3. Controlled tag vocabulary

`src/data/tags.yaml`:

```yaml
- id: robotics
  label: Robotics
  color: blue
- id: cv
  label: Computer Vision
  color: violet
- id: ml
  label: Machine Learning
  color: teal
- id: embedded
  label: Embedded
  color: amber
- id: web
  label: Web
  color: rose
```

A build-time assertion (`src/lib/validate-tags.ts`, called from the `astro:config:done` hook) checks
every project tag against this list and throws with the offending file path. Rationale: free-text tags
degrade into `ROS`/`ros`/`ros2` within a semester and the facet UI becomes unusable.

Keep the list **under ~15 tags**. If it grows past that, the taxonomy is wrong and needs a second
dimension, not more tags.

## 4. Example project entry

`src/content/projects/autonomous-rover/index.mdx`:

```mdx
---
title: Autonomous Rover
summary: A four-wheeled rover that maps an indoor course and navigates it without human input, built for the 2025 university robotics challenge.
cover: ./cover.jpg
coverAlt: The rover on a workshop bench with its lidar mast raised
year: 2025
semester: spring
status: completed
tags: [robotics, cv, embedded]
featured: true
team:
  - { person: ivan-p, role: Firmware }
  - { person: maria-s, role: Perception }
video: https://www.youtube.com/watch?v=XXXXXXXXXXX
videoTitle: Rover completing the challenge course
gallery:
  - { src: ./chassis.jpg, alt: Bare aluminium chassis with motor mounts, caption: Chassis v2 }
  - { src: ./slam.png,   alt: Screenshot of the generated occupancy map }
links:
  repo: https://github.com/example/rover
  paper: https://example.edu/papers/rover-2025.pdf
awards:
  - { title: 2nd place, University Robotics Challenge, year: 2025 }
stack: [ROS 2, PyTorch, C++]
hardware: [Jetson Orin Nano, RPLIDAR A1, Custom PCB]
---

## The problem

…

## How it works

…
```

### Authoring rules

- Folder name **is** the slug and **is** permanent — it appears in the URL and in shared links.
  Lowercase, hyphens, no year suffix unless the project genuinely recurs annually.
- Images live next to `index.mdx`, committed at original resolution. Do not pre-resize them; the
  build does that (see `04-media.md`).
- Body uses `##` and `###` only — `#` is reserved for the page title rendered by the layout.
- Suggested body sections: **The problem → How it works → What we built → Results → What's next**.
  Not enforced, but the template scaffold includes them.

## 5. `people.yaml`

```yaml
- id: ivan-p
  name: Ivan Petrov
  role: Hardware lead
  photo: ./people/ivan-p.jpg
  years: [2023, 2024, 2025]
  alumni: false
  showOnHome: true
  links: { github: https://github.com/ivanp }

- id: maria-s
  name: Maria Sokolova
  role: Perception
  years: [2024, 2025]
  alumni: true
```

Rendering rules (D8 — **no person pages**):

- On a project page: a credit chip `Maria Sokolova · Perception`. The chip is a **link to
  `/projects?team=maria-s`** — this gives each member a shareable "my work here" URL for a CV without
  generating any person routes.
- On the homepage and `/about`: a grid of current members (`alumni: false`) and a compact alumni list.
  `showOnHome` controls who appears in the homepage grid when the roster gets long.
- `photo` is optional; fall back to a generated initials avatar so the grid stays even.

**Privacy note:** this is a public page listing real students. Only include a person after they agree,
list only what they agree to, and honour removal requests promptly. Photos and links are optional by
design for exactly this reason. `10-open-questions.md` asks how consent will be recorded.

## 6. `services.yaml` and `resources.yaml`

```yaml
# services.yaml — club-built products, shown on /resources
- id: vcd
  name: <VCD real name — TBD>
  tagline: One line on what it does
  url: https://vcd.example.edu
  screenshot: ./services/vcd.png
  status: live          # live | beta | retired
  primary: true         # ⇒ also gets a button in the site header (D16)

- id: hw
  name: <HW real name — TBD>
  tagline: …
  url: https://hw.example.edu
  screenshot: ./services/hw.png
  status: live
  primary: true
```

`primary: true` is what puts a service in the header. The header therefore has no hardcoded links —
adding a third flagship service is a data change. Guard: assert at build time that **at most two**
services are `primary`, since three would break the header layout.

```yaml
# resources.yaml
- section: Getting started
  items:
    - { title: ROS 2 official tutorials, url: 'https://…', note: Start here for robotics }
- section: Lab & equipment
  items:
    - { title: 3D printer (Prusa MK4), note: 'Booking via the group chat' }
```

## 7. Content lifecycle

| Task | Who | How |
|---|---|---|
| Add a project | any member | copy `templates/project/`, fill frontmatter, add images, open a PR |
| Add a member | leader | append to `people.yaml` |
| Add an event | leader | new file in `src/content/events/` |
| Retire a project | leader | set `status: archived` — never delete; the URL must keep working |
| Change a tag vocabulary | leader | edit `tags.yaml`, then fix any build errors it surfaces |

A `templates/project/` folder with a commented `index.mdx` and a `CONTRIBUTING.md` section removes
most of the friction for students who have never written frontmatter.
