import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { APIRoute, GetStaticPaths } from 'astro';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { site } from '../../data/site';
import { publishedProjects, tagLabels } from '../../lib/projects';
import { card, ogFonts } from '../../lib/og';

/**
 * One 1200×630 PNG per project, plus the two static cards, rendered at build (07-seo.md §2).
 *
 * Telegram is the club's main channel, and Telegram renders `og:image` for every pasted link — so
 * this is the most-seen surface on the whole site, ahead of any page. It gets more care than the
 * `twitter:*` tags do.
 *
 * `default` and `portal` are generated here rather than hand-made in `public/`, so all three card
 * types share one template and one typeface. A link to `/` pasted in a chat should not preview as
 * a project page, which is why `portal` exists at all rather than reusing `default`.
 *
 * Budget: ~0.5–1 s per image. At three projects that is invisible; at the ~200 where caching by a
 * hash of {title, summary, tags, year} would start to pay for itself, the club will be 25 years old.
 */

type Card = { title: string; subtitle?: string; meta?: string; trailing?: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await publishedProjects();
  const labels = await tagLabels();

  const projectCards = projects.map((project) => ({
    params: { slug: project.id },
    props: {
      card: {
        title: project.data.title,
        subtitle: project.data.summary,
        meta: project.data.tags.map((tag) => labels.get(tag)?.label ?? tag).join(' · '),
        trailing: String(project.data.year),
      } satisfies Card,
    },
  }));

  return [
    ...projectCards,
    // The fallback for every non-project page. Its subtitle is the club's own one-liner, so a
    // shared link to /club/join previews as the club rather than as an untitled box.
    {
      params: { slug: 'default' },
      props: { card: { title: site.fullName, subtitle: site.tagline } satisfies Card },
    },
    {
      params: { slug: 'portal' },
      props: {
        card: {
          title: site.name,
          subtitle: 'The club, and the tools it builds.',
        } satisfies Card,
      },
    },
  ];
};

/** The mark, inlined as a data URI — satori cannot fetch, and must not be given a reason to. */
let logoUri: Promise<string> | undefined;
function logo(): Promise<string> {
  logoUri ??= readFile(fileURLToPath(new URL('../../../public/icon-192.png', import.meta.url))).then(
    (buffer) => `data:image/png;base64,${buffer.toString('base64')}`,
  );
  return logoUri;
}

export const GET: APIRoute = async ({ props }) => {
  const svg = await satori(card({ ...(props.card as Card), logo: await logo() }), {
    width: 1200,
    height: 630,
    fonts: await ogFonts(),
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
