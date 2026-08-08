import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { routes } from './routes';
import { formatBytes } from './format';

/**
 * Build-time facts about the committed original behind an optimized image (D9, 04-media.md §A3/§A4).
 *
 * The lightbox promises "View original (PNG, 4000×3000, 11.4 MB)" rather than an unlabelled link,
 * because a visitor on mobile data deserves to know what a tap costs. That label has to come from
 * somewhere, and `dist/originals/manifest.json` cannot be it: the `copy-originals` integration runs
 * on `astro:build:done`, which is strictly AFTER every page has rendered. A page cannot read a file
 * that does not exist yet.
 *
 * So the numbers are read here, from the source file, while the page renders. Dimensions and format
 * come free from `ImageMetadata`; only the byte count needs the filesystem. The manifest is still
 * written — it is the machine-readable record of what shipped — but nothing on a page depends on it.
 */

export type Original = {
  href: string;
  filename: string;
  /** "PNG · 746×280 · 42.5 kB" — everything a visitor needs before deciding to tap. */
  label: string;
};

const PROJECTS_ROOT = fileURLToPath(new URL('../content/projects/', import.meta.url));

/**
 * The committed filename, recovered from the emitted asset path.
 *
 * Two shapes have to work. `astro dev` serves `/@fs/<abs>/architecture.png?origWidth=746&…`, and
 * `astro build` emits `/_astro/architecture.CDA5W8k_.png`.
 *
 * The hash character class is `[A-Za-z0-9_-]`, not `[a-f0-9]`: Astro's content hash is base64url,
 * so a hex-only pattern silently fails to strip hashes like `CDA5W8k_` and the "View original"
 * link 404s — on the one link in the gallery that is supposed to be the permanent one.
 */
export function originalFilename(src: ImageMetadata): string {
  const base = (src.src.split('?')[0] ?? '').split('/').pop() ?? '';
  return base.replace(/\.[A-Za-z0-9_-]{8}(\.[A-Za-z0-9]+)$/, '$1');
}

export async function describeOriginal(slug: string, src: ImageMetadata): Promise<Original> {
  const filename = originalFilename(src);
  const parts = [src.format.toUpperCase(), `${src.width}×${src.height}`];

  try {
    const { size } = await stat(path.join(PROJECTS_ROOT, slug, filename));
    parts.push(formatBytes(size));
  } catch {
    // The file is not where the filename says it is — which means `originalFilename` failed to
    // recover it, and the href below is about to 404. Degrade the label rather than the build: an
    // unlabelled link is worse than a labelled one and better than a failed deploy of the whole
    // site over one gallery image.
  }

  return { href: routes.original(slug, filename), filename, label: parts.join(' · ') };
}
