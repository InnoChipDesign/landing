// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

import copyOriginals from './src/integrations/copy-originals.ts';
import generateCsp from './src/integrations/generate-csp.ts';

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
    generateCsp(),
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

  // The three families from 06-design-system.md §2, self-hosted.
  //
  // `local`, with the woff2 files resolved out of the installed @fontsource-variable packages,
  // rather than the `google`/`fontsource` remote providers. The remote providers would make
  // `docker compose build` depend on reaching a third party — the property this whole site is
  // built around (07 §6: zero third-party requests, and a build that works on a machine that
  // cannot reach the open internet). npm packages are already pinned in the lockfile, so this is
  // reproducible in a way a network fetch is not, and it keeps ~700 KB of binaries out of git
  // history where they would be permanent.
  //
  // One variable file per family covers the whole weight range, so `weights: ['400 700']` costs
  // one download, not four. Latin subset only (D3 — the site is English-only).
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Source Serif 4 Variable',
      cssVariable: '--font-display-face',
      fallbacks: ['Georgia', 'Times New Roman', 'serif'],
      options: {
        variants: [
          {
            src: ['@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2'],
            weight: '200 900',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Inter Variable',
      cssVariable: '--font-sans-face',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            src: ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono Variable',
      cssVariable: '--font-mono-face',
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          {
            src: [
              '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
            ],
            weight: '100 800',
            style: 'normal',
          },
        ],
      },
    },
  ],
});
