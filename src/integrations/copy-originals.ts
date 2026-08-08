import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

/**
 * D9 / 04-media.md §A3 — copy every committed project image into `dist/originals/<slug>/` byte for
 * byte, and record a manifest beside them.
 *
 * The manifest is what lets the lightbox say "View original (JPEG, 11.4 MB)" instead of offering an
 * unlabelled link. A visitor on mobile data deserves to know before tapping.
 *
 * Why an integration rather than putting the originals in `public/`: `public/` would duplicate
 * every image in the repository — once for the build pipeline, once verbatim — doubling repo size
 * and letting the two copies drift. One source file, two outputs.
 */

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']);

export type OriginalEntry = {
  slug: string;
  filename: string;
  bytes: number;
  format: string;
  width?: number;
  height?: number;
};

export default function copyOriginals(): AstroIntegration {
  return {
    name: 'copy-originals',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const projectsDir = new URL('./src/content/projects/', new URL('../../', import.meta.url));
        const sourceRoot = fileURLToPath(projectsDir);

        let slugs: string[];
        try {
          const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
          slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
        } catch {
          logger.warn('no src/content/projects directory — nothing to copy');
          return;
        }

        const outRoot = path.join(fileURLToPath(dir), 'originals');
        const manifest: OriginalEntry[] = [];

        for (const slug of slugs) {
          const from = path.join(sourceRoot, slug);
          const files = (await fs.readdir(from, { withFileTypes: true }))
            .filter((e) => e.isFile() && IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
            .map((e) => e.name);
          if (files.length === 0) continue;

          const to = path.join(outRoot, slug);
          await fs.mkdir(to, { recursive: true });

          for (const filename of files) {
            const source = path.join(from, filename);
            await fs.copyFile(source, path.join(to, filename));
            const { size } = await fs.stat(source);
            // Dimensions are part of the label the lightbox shows before a download; sharp is
            // already a dependency of the image pipeline, so probing costs nothing extra.
            let width: number | undefined;
            let height: number | undefined;
            try {
              const { default: sharp } = await import('sharp');
              ({ width, height } = await sharp(source).metadata());
            } catch {
              // An SVG or an unreadable file — the size and format alone are still useful.
            }
            manifest.push({
              slug,
              filename,
              bytes: size,
              format: path.extname(filename).slice(1).toLowerCase(),
              width,
              height,
            });
          }
        }

        if (manifest.length > 0) {
          await fs.mkdir(outRoot, { recursive: true });
          await fs.writeFile(
            path.join(outRoot, 'manifest.json'),
            `${JSON.stringify(manifest, null, 2)}\n`,
            'utf-8',
          );
        }

        logger.info(`copied ${manifest.length} original image(s) into dist/originals/`);
      },
    },
  };
}
