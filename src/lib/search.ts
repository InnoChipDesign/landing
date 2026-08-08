/**
 * The ONLY module in the codebase that knows Pagefind exists (03-search-and-filtering.md §7).
 *
 * ── What this returns, and why it is narrower than the plan sketched ─────────────────────────
 * `03` §3 sketched a wrapper that returns fully-materialized result rows — title, summary, image,
 * tags — for the island to render. That made sense in a design where results come from the index.
 * It does not survive D22: the complete, non-paginated project list is ALREADY server-rendered in
 * the DOM, with the real `ProjectRow` markup and real optimized thumbnails.
 *
 * So this module returns matching slugs in relevance order and nothing else. The island reorders
 * and hides the rows that are already on the page. Three things fall out of that:
 *
 *   · There is exactly one row implementation. A Preact copy of `ProjectRow` could drift from the
 *     Astro original, and smoke test 5 in `03` §6 exists precisely because that drift is invisible
 *     until someone browses with JavaScript off.
 *   · The `image` Pagefind meta is unnecessary — the row already has its thumbnail, stub included
 *     (D21) — which is why `[slug].astro` never grew the data-URI stub emitter it was TODO'd for.
 *   · Facet counts are computed from the DOM, not from Pagefind's `filters` response. They are
 *     exact either way, and the DOM is the only source that still works in degraded mode. Counts
 *     vanishing exactly when the page is already degraded is the wrong failure.
 *
 * Pagefind is therefore used for one thing: ranking free text across the full project prose, which
 * the DOM cannot do — the rows carry a two-line summary, not the body.
 *
 * ── If we ever outgrow Pagefind ──────────────────────────────────────────────────────────────
 * Reimplement `search()` and `isAvailable()` against the same signatures. The island, the URL sync,
 * the facet UI and the markup contract are all engine-agnostic.
 */

type PagefindResult = { id: string; url: string };
type PagefindModule = {
  options: (opts: Record<string, unknown>) => Promise<void>;
  init: () => Promise<void>;
  search: (query: string | null) => Promise<{ results: PagefindResult[] }>;
};

let modulePromise: Promise<PagefindModule | null> | undefined;
let available = false;

/**
 * False when `/pagefind/pagefind.js` 404s — the normal state under `astro dev`, where Pagefind's
 * index does not exist because Pagefind indexes BUILT HTML. `pnpm search:dev` copies a built index
 * into `public/` for working on this page specifically.
 *
 * Only meaningful after `load()` has settled.
 */
export function isAvailable(): boolean {
  return available;
}

async function load(): Promise<PagefindModule | null> {
  modulePromise ??= (async () => {
    try {
      // Pagefind is generated at build time and lives outside Vite's module graph. Both the
      // @vite-ignore comment and the runtime-built path are required — a literal specifier here
      // makes Vite try to resolve a file that does not exist until after the build.
      const path = '/pagefind/pagefind.js';
      const pagefind = (await import(/* @vite-ignore */ path)) as PagefindModule;
      await pagefind.options({ excerptLength: 25 });
      await pagefind.init();
      available = true;
      return pagefind;
    } catch {
      available = false;
      return null;
    }
  })();
  return modulePromise;
}

/** Kick off loading without waiting — called on first focus of the query box. */
export function warm(): void {
  void load();
}

/**
 * Slugs matching `query`, most relevant first.
 *
 * `null` means "text search is unavailable" and is deliberately distinct from `[]`, which means
 * "searched, found nothing". The island shows an empty state for the second and keeps every row
 * visible for the first — silently hiding the whole list because an index is missing would be a
 * far worse outcome than an unfiltered one.
 */
export async function search(query: string): Promise<string[] | null> {
  const trimmed = query.trim();
  if (trimmed === '') return null;

  const pagefind = await load();
  if (!pagefind) return null;

  try {
    const { results } = await pagefind.search(trimmed);
    return results.map((result) => slugFromUrl(result.url)).filter((slug) => slug !== '');
  } catch {
    return null;
  }
}

/** `/club/projects/schoolrv32i/` (or `.../index.html`) → `schoolrv32i`. */
export function slugFromUrl(url: string): string {
  const clean = (url.split(/[?#]/)[0] ?? '').replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return clean.split('/').pop() ?? '';
}
