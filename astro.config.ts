import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig, fontProviders } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import compress from 'astro-compress';

import astrowind from './vendor/integration';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'static',

  // Fonts, self-hosted through the `local` provider with the woff2 files resolved out of the
  // installed @fontsource-variable packages — not the `google`/`fontsource` remote providers.
  // A remote provider makes `docker compose build` depend on reaching a third party; npm packages
  // are already pinned in the lockfile, so this is reproducible in a way a network fetch is not,
  // and it keeps ~700 KB of binaries out of git history where they would be permanent.
  //
  // One variable file per family covers the whole weight range, so this is one download per family,
  // not four. Latin subset only — the site is English-only.
  //
  // Consumed as --font-display-face / --font-sans-face / --font-mono-face, which
  // src/components/CustomStyles.astro maps onto AstroWind's --aw-font-* variables.
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
            src: ['@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2'],
            weight: '100 800',
            style: 'normal',
          },
        ],
      },
    },
  ],

  integrations: [
    sitemap(),
    mdx(),
    icon({
      include: {
        tabler: ['*'],
        // One icon, from one place: the header's way back out to the portal. Everything else on
        // the site is Tabler — mixing two icon families across a page is visible.
        lucide: ['arrow-up-left'],
      },
    }),

    compress({
      // csso off on purpose: its parser doesn't understand the media range
      // syntax Tailwind v4 emits for breakpoints (`@media (width>=48rem)`) and
      // silently drops every one of those blocks — the site then renders as if
      // all `md:`/`lg:` classes were missing. lightningcss parses it correctly.
      CSS: { csso: false, lightningcss: { minify: true } },
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),

    astrowind({
      config: './src/config.yaml',
    }),
  ],

  image: {
    // `domains` only matters for remote URLs that reach Astro's native <Image />.
    // Nothing on this site loads a remote image; the entry is kept because
    // src/components/common/Image.astro still routes through unpic for them.
    domains: ['cdn.pixabay.com'],
    responsiveStyles: true,
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },
});
