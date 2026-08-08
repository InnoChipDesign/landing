import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
// `z` re-exported from `astro:content` is deprecated in Astro 7 — `astro/zod` is the supported
// import and pins the same zod the content layer validates with.
import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';

/** D23 — what the project IS. Publication is the separate `draft` flag. Two different axes. */
const STATUS = ['idea', 'in-progress', 'completed', 'archived'] as const;

/** D24 — basic track runs spring/fall. Advanced students run trimesters, hence summer. */
const SEMESTER = ['spring', 'fall', 'summer'] as const;

const SERVICE_STATUS = ['live', 'beta', 'retired'] as const;

const EVENT_KIND = ['meeting', 'workshop', 'competition', 'demo-day', 'other'] as const;

const ID = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase, digits and hyphens only');

// ─────────────────────────────────────────────────────────────────────────────
// Content collections
// ─────────────────────────────────────────────────────────────────────────────

const projects = defineCollection({
  loader: glob({ pattern: '**/index.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().max(70),
        // Reused verbatim as the meta description and inside the generated OG image, which is why
        // it is length-bounded. Unbounded text breaks both.
        summary: z.string().min(40).max(200),

        // D21 — optional. A deterministic stub renders when absent, so the row list stays uniform
        // and nobody is blocked on publishing because they lack a photo.
        cover: image().optional(),
        coverAlt: z.string().min(5).optional(),

        year: z.number().int().min(2015).max(2100),
        semester: z.enum(SEMESTER).optional(),
        status: z.enum(STATUS),

        // Every value must exist in tags.yaml — checked at build by src/lib/validate.ts.
        // Capped at 6, not 8: with an 11-tag vocabulary, a project carrying 8 categorises nothing.
        tags: z.array(z.string()).min(1).max(6),
        featured: z.boolean().default(false),
        order: z.number().default(0), // manual tie-break within a year

        // `person` is optional so a one-off contributor can be credited by name alone without an
        // entry in people.yaml — the minimum-consent path (D8). When it IS given,
        // reference('people') makes a typo'd id a build error rather than a missing credit.
        team: z
          .array(
            z.object({
              person: reference('people').optional(),
              name: z.string().optional(),
              role: z.string().optional(),
            }),
          )
          .default([]),

        // D10 — the provider is parsed at build time from the URL; any of the four is fine, and
        // different projects may use different hosts.
        video: z.url().optional(),
        videoTitle: z.string().optional(),
        videoPoster: image().optional(), // facade thumbnail; falls back to `cover`, then the stub

        gallery: z
          .array(
            z.object({
              src: image(),
              alt: z.string().min(5),
              caption: z.string().optional(),
            }),
          )
          .default([]),

        links: z
          .object({
            repo: z.url().optional(),
            docs: z.url().optional(),
            paper: z.url().optional(),
            poster: z.url().optional(),
            demo: z.url().optional(),
          })
          .default({}),

        awards: z
          .array(
            z.object({
              title: z.string(),
              event: z.string().optional(),
              year: z.number().optional(),
            }),
          )
          .default([]),
        stack: z.array(z.string()).default([]), // "SystemVerilog", "Vivado", "Verilator"
        hardware: z.array(z.string()).default([]), // "Basys 3", "Tang Nano 9K"

        draft: z.boolean().default(false), // excluded from the build output entirely
        updated: z.coerce.date().optional(),
      })
      // A missing alt is an accessibility failure the build should not permit. A missing photo is
      // not — hence `cover` optional but `coverAlt` required whenever a cover exists.
      .refine((d) => !d.cover || !!d.coverAlt, {
        message: 'coverAlt is required whenever cover is set',
        path: ['coverAlt'],
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
      kind: z.enum(EVENT_KIND).default('other'),
      cover: image().optional(),
      coverAlt: z.string().min(5).optional(),
      link: z.url().optional(),
      draft: z.boolean().default(false),
    }),
});

/** Long-form copy for the fixed routes. Generates no pages of its own — it is imported. */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    lead: z.string().optional(),
    /** 🟡 Copy drafted during planning that the club leader has not yet approved (05 §13). */
    draftCopy: z.boolean().default(false),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Data collections — no routes are generated from any of these
// ─────────────────────────────────────────────────────────────────────────────

const people = defineCollection({
  loader: file('./src/data/people.yaml'),
  schema: ({ image }) =>
    z.object({
      id: ID,
      name: z.string(), // ← the ONLY required field besides id (D8)
      role: z.string().optional(), // "Instructor", "RTL", "Verification"
      officer: z.boolean().default(false), // shown in the leadership block
      photo: image().optional(),
      years: z.array(z.number().int()).default([]),
      alumni: z.boolean().default(false),
      links: z
        .object({
          github: z.url().optional(),
          site: z.url().optional(),
          telegram: z.url().optional(),
        })
        .default({}),
    }),
});

const tags = defineCollection({
  loader: file('./src/data/tags.yaml'),
  schema: z.object({
    id: ID,
    label: z.string(),
    color: z.string(),
    hint: z.string().optional(),
  }),
});

const services = defineCollection({
  loader: file('./src/data/services.yaml'),
  schema: ({ image }) =>
    z.object({
      id: ID,
      name: z.string(),
      /**
       * Header-button label, when the full name is too long for a bar that is already at its
       * limit (see Header.astro). Everywhere with room — the portal tile, /club/resources — uses
       * `name`, because "VCD" tells a first-time visitor nothing and "Visual Circuit Designer"
       * tells them everything. Capped so it cannot quietly become a second name.
       */
      short: z.string().max(8).optional(),
      tagline: z.string().max(80).optional(),
      url: z.string(),
      kind: z.enum(['internal', 'external']),
      status: z.enum(SERVICE_STATUS).default('live'),
      onPortal: z.boolean().default(false),
      inHeader: z.boolean().default(false),
      screenshot: image().optional(),
      screenshotAlt: z.string().min(5).optional(),
    }),
});

const equipment = defineCollection({
  loader: file('./src/data/equipment.yaml'),
  schema: ({ image }) =>
    z
      .object({
        id: ID,
        name: z.string(), // ← the only required field besides id
        description: z.string().max(160).optional(),
        link: z.url().optional(), // vendor page, datasheet, or booking form
        photo: image().optional(), // the stub renders when absent (D21)
        photoAlt: z.string().min(5).optional(),
        category: z.string().optional(), // free text — "FPGA boards", "Instruments"
        order: z.number().default(0),
      })
      .refine((d) => !d.photo || !!d.photoAlt, {
        message: 'photoAlt is required whenever photo is set',
        path: ['photoAlt'],
      }),
});

const resources = defineCollection({
  // Authors write `section:` rather than `id:` — a curated link list should read like one. The
  // parser derives the id so the file stays free of bookkeeping fields.
  loader: file('./src/data/resources.yaml', {
    parser: (text) => {
      const parsed: unknown = parseYaml(text);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((entry: Record<string, unknown>) => ({
        ...entry,
        id: slugify(String(entry.section ?? '')),
      }));
    },
  }),
  schema: z.object({
    id: ID,
    section: z.string(),
    items: z
      .array(
        z.object({
          title: z.string(),
          url: z.url(),
          note: z.string().optional(),
        }),
      )
      .default([]),
  }),
});

export const collections = { projects, events, pages, people, tags, services, equipment, resources };

// ─────────────────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
