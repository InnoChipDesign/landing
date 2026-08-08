/**
 * The `/club/projects` query string (03-search-and-filtering.md §4).
 *
 *     /club/projects?q=riscv&tags=cpu,fpga&year=2023&status=completed&sort=oldest
 *
 * Note what is absent and stays absent: no `team=` (D7 removed the facet), no `page=` (D22 removed
 * pagination), and no `image=` on a project page (D28).
 *
 * Round-trip invariant, unit-tested: `parse(serialize(s)) === s` for every valid state, and
 * `serialize(parse(x))` is stable for every string this module itself produced. Both hold only
 * because multi-value keys are sorted on the way out — otherwise the same filter set could produce
 * `tags=fpga,cpu` or `tags=cpu,fpga` depending on click order, and two identical views would have
 * two different shareable URLs.
 */

export const SORTS = ['newest', 'oldest', 'title', 'relevance'] as const;
export type Sort = (typeof SORTS)[number];

export type ExplorerState = {
  q: string;
  tags: string[];
  year: string[];
  status: string[];
  sort: Sort;
};

/** The values a facet may take, gathered from the rows actually on the page. */
export type Vocabulary = {
  tags: ReadonlySet<string>;
  year: ReadonlySet<string>;
  status: ReadonlySet<string>;
};

export const DEFAULT_SORT: Sort = 'newest';

export const EMPTY_STATE: ExplorerState = {
  q: '',
  tags: [],
  year: [],
  status: [],
  sort: DEFAULT_SORT,
};

export function isDefault(state: ExplorerState): boolean {
  return (
    state.q === '' &&
    state.tags.length === 0 &&
    state.year.length === 0 &&
    state.status.length === 0 &&
    state.sort === DEFAULT_SORT
  );
}

/**
 * `location.search` → state. Never throws.
 *
 * Unknown and invalid values are dropped rather than errored, because the input is a URL somebody
 * pasted: a link shared before a tag was renamed should still render the rest of the view, not a
 * blank page or an error. `vocabulary` is derived from the rendered rows, so "valid" means "a
 * facet value that exists on this page right now".
 */
export function parse(search: string, vocabulary: Vocabulary): ExplorerState {
  const params = new URLSearchParams(search);

  const list = (key: keyof Vocabulary): string[] => {
    const raw = params.get(key === 'tags' ? 'tags' : key) ?? '';
    const allowed = vocabulary[key];
    const seen = new Set(
      raw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value !== '' && allowed.has(value)),
    );
    return [...seen].sort();
  };

  const sort = params.get('sort');

  return {
    q: (params.get('q') ?? '').trim(),
    tags: list('tags'),
    year: list('year'),
    status: list('status'),
    sort: isSort(sort) ? sort : DEFAULT_SORT,
  };
}

/**
 * State → `"?q=…"`, or `""` when nothing is set.
 *
 * Keys at their default are omitted, so `/club/projects` stays `/club/projects` — a filter bar
 * that rewrites a clean URL into `?q=&tags=&sort=newest` on first paint makes every share look
 * like a filtered view.
 */
export function serialize(state: ExplorerState): string {
  const params = new URLSearchParams();
  if (state.q !== '') params.set('q', state.q);
  if (state.tags.length > 0) params.set('tags', [...state.tags].sort().join(','));
  if (state.year.length > 0) params.set('year', [...state.year].sort().join(','));
  if (state.status.length > 0) params.set('status', [...state.status].sort().join(','));
  if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

/** Toggle one value inside one facet, keeping the array sorted so the URL stays canonical. */
export function toggle(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value].sort();
}

export function isSort(value: unknown): value is Sort {
  return typeof value === 'string' && (SORTS as readonly string[]).includes(value);
}

/**
 * Write the state into the address bar.
 *
 * `replaceState` for filter changes, so clicking six chips does not put six entries in the
 * visitor's history and make Back a chore. `pushState` for "Clear all", which IS a discrete action
 * somebody may want to undo — that is the one case where Back should restore the previous view.
 */
export function commit(state: ExplorerState, mode: 'replace' | 'push' = 'replace'): void {
  const url = `${location.pathname}${serialize(state)}`;
  if (mode === 'push') history.pushState(state, '', url);
  else history.replaceState(state, '', url);
}
