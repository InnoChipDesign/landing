import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

import { PROVIDER_ORIGINS } from '../lib/video';

/**
 * Generates the Content-Security-Policy at build time (08-deployment.md §6, D29).
 *
 * ── Why this exists instead of Astro's `security.csp` ────────────────────────────────────────
 * `08` §6 said to prefer Astro's built-in CSP. It cannot be used here, for two reasons that only
 * surface once there is real content:
 *
 *   1. **Shiki.** Astro's own documentation states its CSP implementation does not support Shiki,
 *      because Shiki colours tokens with inline `style` attributes. The suggested workaround is to
 *      swap in Prism — but the code blocks ARE the substance of a project page on this site (05
 *      §6), and Shiki is what gives them dual-theme Verilog and SystemVerilog highlighting.
 *   2. Astro's `directives` allow-list has no `style-src-attr`, so there is no way to permit those
 *      inline style attributes without opening `style-src 'unsafe-inline'` wholesale — which would
 *      also permit injected `<style>` elements.
 *
 * The policy below splits the difference precisely: `style-src 'self'` still forbids injected
 * `<style>` blocks, while `style-src-attr 'unsafe-inline'` permits the attribute form that Shiki,
 * the cover stub's per-slug tint (D21) and the video facade's aspect-ratio box all rely on.
 *
 * ── What is generated rather than written ────────────────────────────────────────────────────
 *   · `frame-src` — the exact set of video hosts the published content references, from the one
 *     module that knows them (`src/lib/video.ts`). `'none'` when no project has a video, which is
 *     the case today. It can never say `*` and cannot drift from the parsers.
 *   · `script-src` hashes — every inline `<script>` actually present in the built HTML, hashed
 *     from the output rather than from the source. A hash computed from source is a hash of what
 *     someone believed shipped.
 *
 * Output is a Caddy snippet written NEXT TO `dist/`, not inside it: the policy is server
 * configuration and must never be served as a static file.
 */

/** D29 — report-only until a week of clean reports. Flipped via CSP_HEADER in `.env`. */
const HEADER_DEFAULT = 'Content-Security-Policy-Report-Only';

/** The script types a browser executes. Everything else is a data block. */
const JS_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);

/**
 * `script-src` governs executable scripts only. The `application/ld+json` block this site emits on
 * every page (07 §3) is data — the browser never runs it — so hashing it would add a hash per page
 * that changes whenever anyone edits a project's title, for no security benefit at all.
 */
function isExecutable(attributes: string): boolean {
  const type = /\stype\s*=\s*["']?([^"'\s>]*)/i.exec(attributes)?.[1] ?? '';
  return JS_TYPES.has(type.toLowerCase());
}

export default function generateCsp(): AstroIntegration {
  return {
    name: 'generate-csp',
    hooks: {
      'astro:build:done': async ({ dir, pages, logger }) => {
        const outDir = fileURLToPath(dir);

        // ── inline script hashes ──────────────────────────────────────────────────────────
        // Only `is:inline` scripts land in the HTML; everything else Astro bundles to
        // /_astro/*.js and is covered by 'self'. Today that is exactly one: the no-flash theme
        // script in BaseLayout. It is discovered rather than assumed, so adding a second one
        // cannot silently break the policy.
        const hashes = new Set<string>();

        // ── frame-src ─────────────────────────────────────────────────────────────────────
        // Read from the `data-embed` attributes `VideoFacade` emitted, not from the content
        // collection: `astro:content` is a virtual module and its module runner is already closed
        // by this hook. Scanning the output is the better source anyway — it is the set of frames
        // the shipped pages can actually load, so the policy cannot be wider OR narrower than the
        // HTML it protects. A draft project, or one whose video was removed, drops out for free.
        const origins = new Set<string>();

        for (const page of pages) {
          const file = path.join(outDir, page.pathname, 'index.html');
          let html: string;
          try {
            html = await fs.readFile(file, 'utf-8');
          } catch {
            continue; // an endpoint, not a page
          }

          for (const match of html.matchAll(
            /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g,
          )) {
            const body = match[2] ?? '';
            if (body.trim() === '') continue;
            if (!isExecutable(match[1] ?? '')) continue;
            hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
          }

          for (const match of html.matchAll(/data-embed="([^"]+)"/g)) {
            try {
              origins.add(new URL(match[1]!.replace(/&amp;/g, '&')).origin);
            } catch {
              // `parseVideoUrl` already rejects anything unparseable at build time, so this is
              // unreachable — but a CSP generator must not be the thing that fails a build.
            }
          }
        }

        // Every origin must be one `src/lib/video.ts` knows about. If a component ever starts
        // emitting an embed from somewhere else, fail loudly here rather than silently widening
        // the one third-party allowance in the whole policy.
        const known = new Set<string>(Object.values(PROVIDER_ORIGINS));
        for (const origin of origins) {
          if (!known.has(origin)) {
            throw new Error(
              `generate-csp: refusing to allow frame-src ${origin} — it is not in PROVIDER_ORIGINS ` +
                `(src/lib/video.ts). Add a parser there rather than widening the policy here.`,
            );
          }
        }

        const frameSrc = origins.size === 0 ? "'none'" : [...origins].sort().join(' ');

        const policy = [
          "default-src 'self'",
          // `data:` for the generated cover stubs (D21). No third-party host: video posters are
          // committed images, never fetched from a provider's thumbnail API (04 §B2).
          "img-src 'self' data:",
          "font-src 'self'",
          `style-src 'self'`,
          `style-src-attr 'unsafe-inline'`,
          `script-src 'self' ${[...hashes].sort().join(' ')}`.trim(),
          `frame-src ${frameSrc}`,
          // Pagefind fetches its index chunks from this origin, so 'self' is enough.
          "connect-src 'self'",
          "base-uri 'self'",
          "form-action 'none'",
          "frame-ancestors 'self'",
          "object-src 'none'",
        ].join('; ');

        const snippet = `# GENERATED by src/integrations/generate-csp.ts — do not edit, and do not
# commit. Rewritten by every \`pnpm build\` from the inline scripts and the video providers the
# built output actually contains.
#
# D29: the header NAME defaults to report-only. After a week of clean reports, set
#   CSP_HEADER=Content-Security-Policy
# in .env and restart. Before flipping, check the console on: /, /club, a project page with a
# video (click play), a project page with a gallery (open the lightbox), and /club/contact.
header {$CSP_HEADER:${HEADER_DEFAULT}} "${policy}"
`;

        const target = path.join(path.dirname(outDir.replace(/\/$/, '')), 'csp.caddy');
        await fs.writeFile(target, snippet, 'utf-8');

        logger.info(
          `csp: ${hashes.size} inline script hash(es), frame-src ${frameSrc} → ${path.basename(target)}`,
        );
      },
    },
  };
}
