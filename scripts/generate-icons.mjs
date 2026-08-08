/**
 * Rasterises the icon set from the one source mark. Run `pnpm icons` after changing
 * `src/assets/logo.svg`; the outputs are committed, because they are static assets that must exist
 * in `public/` at build time and regenerating them on every build would burn a second of Docker
 * time to produce four byte-identical files.
 *
 * Outputs (all referenced by BaseLayout or site.webmanifest — an unreferenced icon is a 404
 * waiting to happen, and a referenced-but-missing one is a 404 today):
 *
 *   public/favicon.ico          32×32, PNG-in-ICO
 *   public/apple-touch-icon.png 180×180, opaque
 *   public/icon-192.png         192×192  ┐ site.webmanifest
 *   public/icon-512.png         512×512  ┘
 *
 * The OG cards are NOT here. All three kinds — per-project, `default` and `portal` — are rendered
 * by `src/pages/og/[slug].png.ts` at build time, so they share one template and one typeface with
 * each other. `icon-192.png` is what that template inlines as the mark.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const logo = `${root}src/assets/logo.svg`;
const out = `${root}public`;

/** ICO is a 6-byte directory header, one 16-byte entry, then the payload — a PNG is a legal one. */
function ico(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width  (0 means 256)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette size — 0 for truecolour
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12); // offset to the payload
  return Buffer.concat([header, entry, png]);
}

await mkdir(out, { recursive: true });

// `density` matters: sharp rasterises SVG through librsvg at a DPI, so rendering a 640-unit
// artwork at the default 72 dpi and upscaling to 512 produces visibly soft edges on a mark whose
// whole character is hard ones.
const png = (size) => sharp(logo, { density: 600 }).resize(size, size).png({ compressionLevel: 9 });

await png(180).toFile(`${out}/apple-touch-icon.png`);
await png(192).toFile(`${out}/icon-192.png`);
await png(512).toFile(`${out}/icon-512.png`);
await writeFile(`${out}/favicon.ico`, ico(await png(32).toBuffer(), 32));

console.log('icons: wrote favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png');
