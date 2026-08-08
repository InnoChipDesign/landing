// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

import copyOriginals from './src/integrations/copy-originals.ts';

// `site` is baked into every canonical tag, sitemap entry, OG URL and JSON-LD block at BUILD time
// (08-deployment.md §2). There is deliberately no production default: an accidental default is
// exactly how a production image ends up serving localhost canonicals. `astro dev` gets a localhost
// value because nothing it renders is ever published.
// Only a real `astro build` is gated. `dev`, `check`, `sync` and `preview` fall back to localhost
// because none of them emits HTML anyone will publish, and making `pnpm check` demand a domain is
// friction with no safety payoff.
const isBuild = process.argv.includes('build');
const SITE_URL = process.env.SITE_URL ?? (isBuild ? undefined : 'http://localhost:4321');

if (!SITE_URL) {
  throw new Error(
    'SITE_URL is required for a build.\n' +
      '  local:      SITE_URL=http://localhost:4321 pnpm build\n' +
      '  production: docker compose build (SITE_URL comes from .env)\n' +
      'See planning/08-deployment.md §2 — and note D30, the canonical domain, is still open.',
  );
}

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },

  integrations: [
    mdx(),
    // D11 — Preact, not React. `compat` aliases react/react-dom onto preact/compat so a snippet
    // pasted from a React tutorial still compiles.
    preact({ compat: true }),
    sitemap({
      filter: (page) =>
        !page.includes('/og/') && !page.endsWith('/404') && !page.includes('/styleguide'),
    }),
    // Icons resolve at build time from the locally installed @iconify-json/lucide package and are
    // inlined as SVG. Never an icon font, never a runtime CDN fetch (06 §7).
    icon(),
    copyOriginals(),
  ],

  vite: {
    // Tailwind v4 as a Vite plugin — NOT the deprecated @astrojs/tailwind integration.
    plugins: [tailwindcss()],
  },

  // 04-media.md §A1
  image: {
    responsiveStyles: true,
    layout: 'constrained',
    objectFit: 'cover',
    breakpoints: [400, 640, 800, 1200, 1600, 2000],
  },

  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      // The code blocks are the substance of a project page (05 §6). Shiki bundles the grammars as
      // `verilog` and `system-verilog`; the aliases let a student write the spelling they actually
      // know without the block silently falling back to plaintext.
      langAlias: {
        systemverilog: 'system-verilog',
        sv: 'system-verilog',
        v: 'verilog',
      },
      wrap: false,
    },
  },

  // TODO(phase 1) — Fonts API, `local` provider. Blocked on the three variable woff2 files being
  // committed to src/assets/fonts/ (01-architecture.md §1, 06-design-system.md §2). Until then
  // global.css falls back through the same family stacks. Do NOT switch to the `google` provider:
  // the Docker build must not depend on reaching Google's servers.
  // fonts: [ … ],
});
