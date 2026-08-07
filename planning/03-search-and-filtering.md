# Search & Filtering — `/projects`

Implements D6 (Pagefind), D7 (four facets), and the URL query-param sync requirement.

## 1. What the visitor gets

```
┌────────────────────────────────────────────────────────────────────┐
│  Projects                                                          │
│  ┌──────────────────────────────────────────────┐  ┌────────────┐  │
│  │ 🔍  Search projects…                          │  │ Newest  ▾ │  │
│  └──────────────────────────────────────────────┘  └────────────┘  │
│                                                                    │
│  Tags    [Robotics 12] [CV 8] [ML 6] [Embedded 5] [Web 3]           │
│  Year    [2025 9] [2024 11] [2023 7]                               │
│  Status  [Active 6] [Completed 19] [Seeking members 2]             │
│  Team    [ ▾ choose a member ]                                     │
│                                                                    │
│  Active: [Robotics ×] [2025 ×]              Clear all              │
│  ──────────────────────────────────────────────────────────────    │
│  9 of 38 projects                                                  │
│                                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│  │ [cover]  │ │ [cover]  │ │ [cover]  │   … responsive grid         │
│  │ Title    │ │ Title    │ │ Title    │                            │
│  │ summary… │ │ summary… │ │ summary… │                            │
│  │ ●robotics│ │ ●cv      │ │ ●ml      │                            │
│  │ 2025·done│ │ 2024·done│ │ 2025·live│                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
└────────────────────────────────────────────────────────────────────┘
```

Behaviour:
- Every facet chip shows a **live result count** and disables itself at zero.
- Facets combine as **AND across dimensions, OR within a dimension**
  (`robotics OR cv`) **AND** (`2025`).
- Text query is debounced 150 ms; filters apply immediately.
- Result count is announced to screen readers via `aria-live="polite"`.
- Empty state offers the nearest useful action ("clear filters", or "browse all 38").

## 2. Indexing strategy

Pagefind indexes **built HTML**, so the source of truth for search is the project detail page.

Run scoped to project pages only:

```bash
pagefind --site dist --glob "projects/**/*.html"
```

`/projects/index.html` matches that glob but must not be a search result, so its root element carries
`data-pagefind-ignore`.

### Markup contract on `/projects/<slug>`

`ProjectLayout.astro` emits exactly these attributes. Changing them without updating
`src/lib/search.ts` breaks search silently — hence they are listed here as a contract, and covered by
a smoke test (§6).

```html
<article
  data-pagefind-body
  data-pagefind-filter="tag[data-tags], year[data-year], status[data-status], team[data-team]"
  data-pagefind-sort="year[data-year], title[data-title]"
  data-tags="robotics"        <!-- one element per tag; see note below -->
  data-year="2025"
  data-status="completed"
  data-title="Autonomous Rover"
>
  <h1 data-pagefind-meta="title">Autonomous Rover</h1>

  <!-- card data carried as meta so results render without a second fetch -->
  <span data-pagefind-meta="summary">…</span>
  <img data-pagefind-meta="image[src], image_alt[alt]" src="…" alt="…" />

  <!-- multi-valued facets: one tagged element per value -->
  <ul class="sr-only">
    <li data-pagefind-filter="tag">robotics</li>
    <li data-pagefind-filter="tag">cv</li>
    <li data-pagefind-filter="team">ivan-p</li>
    <li data-pagefind-filter="team">maria-s</li>
  </ul>
</article>
```

Two things worth calling out:

- **Multi-valued filters** (tags, team) cannot come from a single attribute — Pagefind takes one
  value per tagged element. We emit a visually-hidden `<ul>` of filter values. It is
  `aria-hidden="true"` as well as `sr-only`, because it is machine data, not content for a screen
  reader (the visible tag chips already convey it).
- Anything that must be **findable by text** has to be inside `data-pagefind-body`. Title, summary,
  tags, stack, hardware, awards and the prose all are. Team member *names* are indexed too, so typing
  "Maria" finds her projects even though the filter uses ids.

## 3. Client wrapper — `src/lib/search.ts`

```ts
// Pagefind is generated at build time and lives outside Vite's module graph.
// The @vite-ignore comment and the runtime-built path are both required.
const path = '/pagefind/pagefind.js';
const pagefind = await import(/* @vite-ignore */ path);
await pagefind.options({ excerptLength: 25 });
await pagefind.init();
```

Public surface:

```ts
export type Facets = { tags: string[]; year: string[]; status: string[]; team: string[] };
export type Sort = 'newest' | 'oldest' | 'title';

export async function query(q: string, facets: Facets, sort: Sort): Promise<ProjectResult[]>;
export async function counts(facets: Facets): Promise<Record<string, Record<string, number>>>;
export function isAvailable(): boolean;   // false in dev without a built index
```

Implementation notes:

- **Empty query is the normal case.** `pagefind.search(null, { filters })` returns everything matching
  the filters — this is how pure filtering (no text) works, and it is the default state of the page.
- Results are lazy: `search()` returns stubs; `await result.data()` fetches the fragment. Only
  materialize the current page of results (see pagination below).
- Facet counts come from the `filters` object on the search response, so counts reflect the *other*
  active filters — which is why the chips can grey out accurately.
- Sorting uses `data-pagefind-sort`. Note Pagefind applies sort **instead of** relevance ranking, so
  when the visitor has typed a query the default sort switches to `relevance` and the sort control
  gains a "Best match" option. Sorting by date while text-searching would bury the best hit.

### Degraded mode

`isAvailable()` returns false when `/pagefind/pagefind.js` 404s. The explorer then filters the
server-rendered DOM using the `data-*` attributes already present on each card, and disables only the
text input with an inline explanation. This keeps `astro dev` usable and means a broken Pagefind step
degrades the page instead of blanking it.

## 4. URL state — `src/lib/url-state.ts`

Canonical query string:

```
/projects?q=rover&tags=robotics,cv&year=2025&status=active&team=ivan-p&sort=newest&page=2
```

Rules:

| Rule | Reason |
|---|---|
| Keys are omitted when at their default | Clean, shareable URLs; `/projects` stays `/projects` |
| Multi-value keys are comma-joined, values sorted alphabetically | The same filter set always produces the same URL |
| Filter changes use `history.replaceState` | Doesn't flood browser history while clicking chips |
| Explicit navigations (page change, "clear all") use `pushState` | Back button does what the user expects |
| `popstate` re-hydrates state from the URL | Back/forward restore the exact view |
| Unknown or invalid values are dropped, not errored | A stale shared link still renders something sane |
| Scroll position is restored on `popstate` | Returning from a project keeps the visitor's place |

Initial state is parsed from `location.search` **before first paint** of the island, so a shared
filtered link never flashes the unfiltered grid.

## 5. Pagination

Default 24 cards per page.

- Server-rendered fallback: the first 24 cards plus a real `<a href="/projects?page=2">` link, so
  no-JS visitors and crawlers can reach every project. Pages 2+ are prerendered via `getStaticPaths`
  on `/projects/page/[n]` (canonical points back to `/projects` with the query string).
- With JS: paging is client-side and updates `?page=`; no full navigation.

> Alternative considered: infinite scroll. Rejected — it breaks the back button, breaks deep links to
> a scroll position, and hides the total count that makes the directory feel substantial.

## 6. Tests

A minimal but non-optional set, run against `dist/` after a build:

1. `dist/pagefind/pagefind.js` exists and is non-empty.
2. Every `dist/projects/*/index.html` contains `data-pagefind-body` and all four filter names.
3. `dist/projects/index.html` contains `data-pagefind-ignore`.
4. A headless query for a known project title returns that project as the first result.
5. `/projects` with JS disabled renders ≥ 1 project card and a working link to page 2.

Test 2 is the one that catches the silent-breakage scenario described in §2.

## 7. If we ever outgrow Pagefind

The wrapper in `src/lib/search.ts` is the only module that knows Pagefind exists. Swapping in a
different engine means reimplementing `query()`/`counts()` against the same types — the island, the
URL sync, the facets UI and the markup contract are all engine-agnostic. This is the same insulation
the original "keep a path back to Fuse.js" requirement was asking for, achieved with one interface
instead of two implementations.
