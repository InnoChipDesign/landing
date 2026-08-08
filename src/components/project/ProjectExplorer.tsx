import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  EMPTY_STATE,
  DEFAULT_SORT,
  SORTS,
  commit,
  isDefault,
  isSort,
  parse,
  toggle,
  type ExplorerState,
  type Sort,
  type Vocabulary,
} from '../../lib/url-state';
import { isAvailable, search, warm } from '../../lib/search';

/**
 * Island 1 of 2 (01-architecture.md §4). Implements D6, D7 (three facets), D20, D22 and the URL
 * query-param sync in 03-search-and-filtering.md.
 *
 * ── It does not render the project rows ──────────────────────────────────────────────────────
 * The complete list is server-rendered by `ProjectRow.astro` and is already in the DOM, with real
 * links and real optimized thumbnails. This island reads those rows, then reorders and hides them.
 * Nothing here re-implements a row.
 *
 * That is what makes smoke test 5 in `03` §6 structurally true rather than merely tested: there is
 * no code path in which the island "swallows" the server-rendered list, because the island never
 * owned it. With JavaScript off, the controls below are `display: none` (`.js-only`) and every
 * project is still listed and still reachable.
 *
 * ── Facet counts are computed here, not fetched ──────────────────────────────────────────────
 * Counts reflect the OTHER active facets — selecting `2025` immediately re-counts the tag chips
 * against 2025 only, and a chip that would return nothing disables itself. Computing that from the
 * rows costs one pass over ~20 elements and, unlike Pagefind's `filters` response, keeps working
 * when the index is missing.
 */

/**
 * One row's facet data. Supplied as props from the content collection rather than scraped from the
 * DOM on mount, for one concrete reason: props are available during server rendering, and the DOM
 * is not. Scraping meant the whole control bar rendered to nothing on the server and then appeared
 * on hydration — a visible jump, on the page with the site's only real interaction.
 *
 * It is small — five short fields per project — and `ProjectRow` still owns everything a visitor
 * actually sees. This is the filter index, not a second copy of the row.
 */
export type RowData = {
  slug: string;
  title: string;
  tags: string[];
  year: string;
  status: string;
};

type Row = RowData & {
  /** Server order — "newest first" (D20), including the manual `order` tie-break. */
  rank: number;
};

type Props = {
  /** In the order the server rendered them, which is the `newest` sort. */
  projects: RowData[];
  /** id → display label, so a chip reads "RISC-V" and the URL still carries `riscv`. */
  tagLabels: Record<string, string>;
  statusLabels: Record<string, string>;
};

const FACETS = ['tags', 'year', 'status'] as const;
type Facet = (typeof FACETS)[number];

const FACET_HEADINGS: Record<Facet, string> = {
  tags: 'Topic',
  year: 'Year',
  status: 'Status',
};

const SORT_LABELS: Record<Sort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  title: 'Title A–Z',
  relevance: 'Best match',
};

export default function ProjectExplorer({ projects, tagLabels, statusLabels }: Props) {
  const [state, setState] = useState<ExplorerState>(EMPTY_STATE);
  const [matches, setMatches] = useState<string[] | null>(null);
  const [textSearchDown, setTextSearchDown] = useState(false);
  const listRef = useRef<HTMLElement | null>(null);

  const rows: Row[] = useMemo(
    () => projects.map((project, rank) => ({ ...project, rank })),
    [projects],
  );

  const vocabulary: Vocabulary = useMemo(
    () => ({
      tags: new Set(rows.flatMap((row) => row.tags)),
      year: new Set(rows.map((row) => row.year)),
      status: new Set(rows.map((row) => row.status)),
    }),
    [rows],
  );

  // ── Hydrate state from the URL, and follow back/forward ───────────────────────────────────
  // This is the first thing hydration does, so a shared `?tags=riscv` link narrows immediately
  // rather than after a paint of the full list. It cannot happen server-side — a static build has
  // no query string — which is why the island is `client:load` on this page and nothing else.
  useEffect(() => {
    setState(parse(location.search, vocabulary));

    const onPop = () => setState(parse(location.search, vocabulary));
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, [vocabulary]);

  // ── Text query → Pagefind, debounced ──────────────────────────────────────────────────────
  useEffect(() => {
    const query = state.q.trim();
    if (query === '') {
      setMatches(null);
      setTextSearchDown(false);
      return;
    }
    // Filters apply immediately; only the text query is debounced (03 §1).
    const timer = setTimeout(() => {
      void search(query).then((result) => {
        setMatches(result);
        // `null` from a non-empty query means the index is missing, not that nothing matched.
        // Keeping every row visible and saying so beats silently blanking the page.
        setTextSearchDown(result === null && !isAvailable());
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [state.q]);

  /**
   * Sort while a query is active defaults to relevance, because sorting by date during a text
   * search buries the best hit (03 §3). This is a DERIVED value, not a state write: switching the
   * stored sort would push `?sort=relevance` into the URL on every keystroke, and would strand the
   * visitor on relevance after they cleared the query.
   */
  const effectiveSort: Sort =
    state.q.trim() !== '' && state.sort === DEFAULT_SORT && matches !== null
      ? 'relevance'
      : state.sort;

  // ── Filtering ─────────────────────────────────────────────────────────────────────────────
  // AND across dimensions, OR within one: (fpga OR riscv) AND (2025).
  const passesFacets = useCallback(
    (row: Row, ignore?: Facet) => {
      const okTags =
        ignore === 'tags' ||
        state.tags.length === 0 ||
        row.tags.some((tag) => state.tags.includes(tag));
      const okYear = ignore === 'year' || state.year.length === 0 || state.year.includes(row.year);
      const okStatus =
        ignore === 'status' || state.status.length === 0 || state.status.includes(row.status);
      return okTags && okYear && okStatus;
    },
    [state.tags, state.year, state.status],
  );

  const visible = useMemo(() => {
    const allowed = matches === null ? null : new Set(matches);
    const kept = rows.filter((row) => passesFacets(row) && (allowed === null || allowed.has(row.slug)));

    const order = matches === null ? [] : matches;
    const sorted = [...kept];
    if (effectiveSort === 'relevance' && order.length > 0) {
      sorted.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
    } else if (effectiveSort === 'oldest') {
      sorted.sort((a, b) => b.rank - a.rank);
    } else if (effectiveSort === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => a.rank - b.rank);
    }
    return sorted;
  }, [rows, matches, passesFacets, effectiveSort]);

  /** Counts for one facet ignore that facet's own selection, so chips never all read zero. */
  const counts = useMemo(() => {
    const allowed = matches === null ? null : new Set(matches);
    const tally = (facet: Facet, valuesOf: (row: Row) => string[]) => {
      const result: Record<string, number> = {};
      for (const row of rows) {
        if (!passesFacets(row, facet)) continue;
        if (allowed !== null && !allowed.has(row.slug)) continue;
        for (const value of valuesOf(row)) result[value] = (result[value] ?? 0) + 1;
      }
      return result;
    };
    return {
      tags: tally('tags', (row) => row.tags),
      year: tally('year', (row) => [row.year]),
      status: tally('status', (row) => [row.status]),
    } satisfies Record<Facet, Record<string, number>>;
  }, [rows, matches, passesFacets]);

  // ── Apply to the server-rendered rows ─────────────────────────────────────────────────────
  useEffect(() => {
    const list = (listRef.current ??= document.querySelector<HTMLElement>('[data-project-list]'));
    if (!list) return;

    const element = (slug: string) =>
      list.querySelector<HTMLElement>(`[data-project][data-slug="${CSS.escape(slug)}"]`);

    const shown = new Set(visible.map((row) => row.slug));
    for (const row of rows) {
      const el = element(row.slug);
      if (el) el.hidden = !shown.has(row.slug);
    }
    // `append` on an element already in the DOM moves it, so this reorders in place rather than
    // re-creating anything. Images are never re-fetched and scroll position is preserved.
    for (const row of visible) {
      const el = element(row.slug);
      if (el) list.append(el);
    }
  }, [visible, rows]);

  // ── URL sync ──────────────────────────────────────────────────────────────────────────────
  const update = useCallback((next: ExplorerState, mode: 'replace' | 'push' = 'replace') => {
    setState(next);
    commit(next, mode);
  }, []);

  const facetValues = (facet: Facet): string[] => {
    const values = [...vocabulary[facet]];
    return facet === 'year' ? values.sort((a, b) => Number(b) - Number(a)) : values.sort();
  };

  const labelFor = (facet: Facet, value: string): string => {
    if (facet === 'tags') return tagLabels[value] ?? value;
    if (facet === 'status') return statusLabels[value] ?? value;
    return value;
  };

  const active = FACETS.flatMap((facet) =>
    state[facet].map((value) => ({ facet, value, label: labelFor(facet, value) })),
  );

  if (rows.length === 0) return null;

  return (
    // `.js-only` keeps every control out of the no-JS render. A search box that does nothing is
    // worse than no search box, and the complete list below it works either way.
    <div class="js-only">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label class="flex-1">
          <span class="sr-only">Search projects</span>
          <input
            type="search"
            value={state.q}
            placeholder="Search projects…"
            onFocus={warm}
            onInput={(event) => update({ ...state, q: event.currentTarget.value })}
            class="w-full rounded-(--radius-md) border border-(--color-border) bg-(--color-bg) px-4 py-2.5 text-(--color-text) placeholder:text-(--color-muted)"
          />
        </label>

        <label class="flex items-center gap-2 text-(length:--text-meta) text-(--color-muted)">
          <span>Sort</span>
          <select
            value={effectiveSort}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (isSort(value)) update({ ...state, sort: value });
            }}
            class="rounded-(--radius-sm) border border-(--color-border) bg-(--color-bg) px-2 py-1.5 text-(--color-text)"
          >
            {SORTS.filter((sort) => sort !== 'relevance' || state.q.trim() !== '').map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {textSearchDown && (
        <p class="mt-2 text-(length:--text-meta) text-(--color-muted)">
          Text search is unavailable — the index is built by <code>pnpm build</code>, so it does not
          exist under <code>astro dev</code>. Filtering below still works on every project.
        </p>
      )}

      <div class="mt-5 flex flex-col gap-3">
        {FACETS.map((facet) => (
          <div key={facet} class="flex flex-wrap items-baseline gap-2">
            <span
              id={`facet-${facet}`}
              class="w-16 shrink-0 text-(length:--text-meta) font-medium text-(--color-muted)"
            >
              {FACET_HEADINGS[facet]}
            </span>
            <div class="flex flex-wrap gap-2" role="group" aria-labelledby={`facet-${facet}`}>
              {facetValues(facet).map((value) => {
                const count = counts[facet][value] ?? 0;
                const on = state[facet].includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    disabled={count === 0 && !on}
                    onClick={() => update({ ...state, [facet]: toggle(state[facet], value) })}
                    class="inline-flex items-center gap-1.5 rounded-(--radius-full) border px-3 py-1 text-(length:--text-chip) transition-colors duration-(--dur-fast) disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:border-(--color-accent) aria-pressed:bg-(--color-accent-soft) aria-pressed:text-(--color-accent) not-aria-pressed:border-(--color-border) not-aria-pressed:hover:bg-(--color-surface-2)"
                  >
                    {labelFor(facet, value)}
                    <span class="text-(--color-muted) tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-(--color-border) pt-4">
        {/* The one thing a screen-reader user cannot see change when a chip is clicked. */}
        <p aria-live="polite" class="text-(length:--text-meta) text-(--color-muted)">
          {visible.length === rows.length
            ? `${rows.length} project${rows.length === 1 ? '' : 's'}`
            : `${visible.length} of ${rows.length} projects`}
        </p>

        {active.length > 0 && (
          <ul class="flex flex-wrap gap-2">
            {active.map(({ facet, value, label }) => (
              <li key={`${facet}:${value}`}>
                <button
                  type="button"
                  onClick={() => update({ ...state, [facet]: toggle(state[facet], value) })}
                  class="inline-flex items-center gap-1.5 rounded-(--radius-full) bg-(--color-surface-2) px-3 py-1 text-(length:--text-chip) hover:bg-(--color-border)"
                >
                  {label}
                  <span aria-hidden="true">×</span>
                  <span class="sr-only">Remove filter</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!isDefault(state) && (
          <button
            type="button"
            // pushState, not replaceState: clearing is a discrete action, and Back should put the
            // visitor's filter set back rather than leaving the page.
            onClick={() => update(EMPTY_STATE, 'push')}
            class="ml-auto text-(length:--text-meta) text-(--color-accent) hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {visible.length === 0 && (
        <div class="mt-10 rounded-(--radius-lg) border border-(--color-border) bg-(--color-surface) p-8 text-center">
          <p class="font-(family-name:--font-display) text-(length:--text-h3)">
            No projects match those filters
          </p>
          <button
            type="button"
            onClick={() => update(EMPTY_STATE, 'push')}
            class="mt-3 text-(--color-accent) hover:underline"
          >
            Clear filters and show all {rows.length}
          </button>
        </div>
      )}
    </div>
  );
}
