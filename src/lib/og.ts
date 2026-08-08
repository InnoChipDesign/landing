import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Font loading for the generated OG cards (07-seo.md §2).
 *
 * satori does no font loading of its own — it takes `ArrayBuffer`s — and it is fussier about the
 * format than the browser is. Two constraints, both discovered the hard way:
 *
 *   · **No woff2.** Its shaper (`@shuding/opentype.js`) has no brotli decompressor. Plain `.woff`
 *     works, because that is zlib.
 *   · **No variable fonts.** `parseFvarAxis` throws on the `fvar` table of the same
 *     @fontsource-variable files the site serves to browsers. So satori gets static instances.
 *
 * Hence the static `@fontsource/*` packages here, alongside the `@fontsource-variable/*` ones in
 * `astro.config.mjs`. They are the same two typefaces from the same publisher at the same weights
 * — Source Serif 4 at 600 for the display line, exactly what 06 §2 specifies for a heading, and
 * Inter 400 for everything else — so the card matches the site rather than approximating it.
 *
 * They are devDependencies used only at build. Nothing here reaches the browser, and no font
 * binary is committed to git.
 */

const FONTS = [
  { name: 'Serif', weight: 600, file: '@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff' },
  { name: 'Sans', weight: 400, file: '@fontsource/inter/files/inter-latin-400-normal.woff' },
] as const;

// satori's `Weight` is a union of the nine literal weights, so this cannot widen to `number`.
export type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 600; style: 'normal' };

let cached: Promise<LoadedFont[]> | undefined;

/** Read once per build, not once per card. */
export function ogFonts(): Promise<LoadedFont[]> {
  cached ??= Promise.all(
    FONTS.map(async ({ name, weight, file }) => {
      const buffer = await readFile(fileURLToPath(import.meta.resolve(file)));
      return { name, weight, style: 'normal' as const, data: Uint8Array.from(buffer).buffer };
    }),
  );
  return cached;
}

// ─────────────────────────────────────────────────────────────────────────────
// The template
// ─────────────────────────────────────────────────────────────────────────────

/**
 * satori accepts React-shaped elements — `{ type, props }` — and this file has no JSX, deliberately:
 * the project's JSX runtime is Preact's, and handing satori a Preact VNode is relying on two
 * libraries' internal shapes happening to agree. Plain objects cannot drift.
 *
 * satori also supports a deliberately limited CSS subset: flexbox only, no grid, and every
 * container with more than one child needs an explicit `display: flex`. This is not a webpage.
 */
type Node = { type: string; props: Record<string, unknown> };

function h(type: string, style: Record<string, unknown>, children?: unknown): Node {
  return { type, props: { style, ...(children === undefined ? {} : { children }) } };
}

const BRAND = '#40BA21';
const INK = '#10151C';
const MUTED = '#5B6672';

export type CardInput = {
  /** The big line. Wraps to at most three lines before satori clips it. */
  title: string;
  /** The muted line under it — a project's `summary`, already length-bounded by the schema. */
  subtitle?: string;
  /** "RISC-V · CPU · FPGA" */
  meta?: string;
  /** Right-aligned on the meta row — the year. */
  trailing?: string;
  /** The club mark, as a data URI. */
  logo: string;
};

export function card({ title, subtitle, meta, trailing, logo }: CardInput): Node {
  return h(
    'div',
    {
      display: 'flex',
      width: '1200px',
      height: '630px',
      backgroundColor: '#FFFFFF',
      fontFamily: 'Sans',
    },
    [
      // The left accent bar, in the club's green. Decorative, so the brand colour is free to be
      // itself here — nothing in this strip has to meet a text contrast ratio.
      h('div', { display: 'flex', width: '18px', height: '630px', backgroundColor: BRAND }),
      h(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          width: '1182px',
          height: '630px',
        },
        [
          h('div', { display: 'flex', alignItems: 'center' }, [
            { type: 'img', props: { src: logo, width: 44, height: 44, style: { borderRadius: 6 } } },
            h(
              'div',
              {
                display: 'flex',
                marginLeft: '16px',
                fontSize: '24px',
                letterSpacing: '0.14em',
                color: MUTED,
              },
              'INNOCHIPDESIGN',
            ),
          ]),

          h('div', { display: 'flex', flexDirection: 'column' }, [
            h(
              'div',
              {
                display: 'block',
                fontFamily: 'Serif',
                fontWeight: 600,
                fontSize: '64px',
                lineHeight: 1.12,
                color: INK,
                // `lineClamp` is satori's own property, not CSS — it truncates on a word boundary
                // and appends an ellipsis, which is the difference between a card that reads as
                // designed and one that reads as broken. `title` is capped at 70 characters by the
                // schema, so three lines is headroom rather than a limit anyone hits.
                lineClamp: 3,
              },
              title,
            ),
            ...(subtitle
              ? [
                  h(
                    'div',
                    {
                      display: 'block',
                      marginTop: '24px',
                      fontSize: '28px',
                      lineHeight: 1.45,
                      color: MUTED,
                      // Three, not the two `07` §2 sketched. The schema caps `summary` at 200
                      // characters, which lands on three lines at this size — so two would put an
                      // ellipsis through the middle of a summary the card has room to finish. The
                      // clamp stays as the backstop against a schema change, not as the design.
                      lineClamp: 3,
                    },
                    subtitle,
                  ),
                ]
              : []),
          ]),

          h(
            'div',
            {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '24px',
              color: MUTED,
            },
            [
              h('div', { display: 'flex' }, meta ?? ''),
              h('div', { display: 'flex' }, trailing ?? ''),
            ],
          ),
        ],
      ),
    ],
  );
}
