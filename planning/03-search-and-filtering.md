# Search & Filtering — `/club/projects`

Implements D6 (Pagefind), D7 (**three** facets), D20 (row list, not a grid), D22 (no pagination),
and the URL query-param sync requirement.

## 1. What the visitor gets

Row list, not a card grid (D20): thumbnail left, everything else right, generous side margins.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│   Projects                                                                     │
│   Everything the club has built, newest first.                                  │
│                                                                                │
│   ┌────────────────────────────────────────────┐   ┌───────────────────────┐   │
│   │ 🔍  Search projects…                        │   │ Newest             ▾ │   │
│   └────────────────────────────────────────────┘   └───────────────────────┘   │
│                                                                                │
│   Topic   [FPGA 14] [RISC-V 3] [Games 7] [Memory 2] [Verification 1] …          │
│   Year    [2026 4] [2025 6] [2024 7] [2023 3]                                   │
│   Status  [In progress 5] [Completed 13] [Idea 1] [Archived 1]                  │
│                                                                                │
│   Active: [FPGA ×] [2024 ×]                                    Clear all        │
│   ────────────────────────────────────────────────────────────────────────     │
│   7 of 20 projects                                                             │
│                                                                                │
│   ┌──────────┐  schoolRISCV — a teaching CPU, step by step                      │
│   │          │  A minimal RISC-V core built one stage at a time, from a         │
│   │  cover   │  single-cycle datapath to a pipelined implementation.            │
│   │  4:3     │  ● RISC-V  ● CPU  ● FPGA          2024 · Fall · Completed   ▶︎    │
│   └──────────┘                                                                  │
│   ────────────────────────────────────────────────────────────────────────     │
│   ┌──────────┐  Multi-bank memory                                               │
│   │  cover   │  A banked memory subsystem with independent read and write       │
│   │          │  ports, benchmarked against a single-bank baseline.              │
│   │          │  ● Memory  ● FPGA                 2024 · Spring · Completed       │
│   └──────────┘                                                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

Row anatomy, left to right:

| Slot | Content | Notes |
|---|---|---|
| Thumbnail | 4:3 cover, ~180px wide at `lg`, ~96px at `sm` | Stub image when `cover` is absent (D21) |
| Title | `h3`, links to `/club/projects/<slug>` | |
| Summary | 2 lines, clamped | |
| Meta row | tag chips · `year · semester · status` | Chips are **decorative** inside the row |
| Right edge | ▶︎ glyph when the project has a video | One-glance signal that a demo exists |

The **whole row is one link**. Tag chips inside it are not nested links — nested interactive elements
are an accessibility failure. Filtering by a tag happens in the facet bar above, not by clicking a
chip inside a row.

Below `md` the row stacks: thumbnail full-width on top, text beneath.

Behaviour:
- Every facet chip shows a **live result count** and disables itself at zero.
- Facets combine as **AND across dimensions, OR within a dimension**: (`fpga` OR `riscv`) AND (`2024`).
- Text query is debounced 150 ms; filters apply immediately.
- Result count is announced to screen readers via `aria-live="polite"`.
- Empty state offers the nearest useful action ("clear filters", or "browse all 20").
- `content-visibility: auto` on each row, so the full un-paginated list stays cheap.

### Why three facets and not four

The team-member facet is gone (D7). With ~20 projects and per-project teams, a member dropdown would
hold ~40 names, almost all matching exactly one project. Names are still **searchable as free text**
because they sit inside the indexed body — typing a surname finds that person's work — but they get
no facet control and no `?team=` parameter.

## 2. Indexing strategy

Pagefind indexes **built HTML**, so the source of truth for search is the project detail page.

Scoped to project pages only. Note the `club/` segment — the detail pages live at
`dist/club/projects/<slug>/index.html`:

```bash
pagefind --site dist --glob "club/projects/**/*.html"
```

`dist/club/projects/index.html` matches that glob but must not be a search result, so its root
element carries `data-pagefind-ignore`.

### Markup contract on `/club/projects/<slug>`

`ProjectLayout.astro` emits exactly these attributes. Changing them without updating
`src/lib/search.ts` breaks search silently — hence they are a contract here, and covered by a smoke
test (§6).

```html
<article
  data-pagefind-body
  data-pagefind-filter="tag[data-tags], year[data-year], status[data-status]"
  data-pagefind-sort="year[data-year], title[data-title]"
  data-tags="riscv"           <!-- first tag only; see the multi-value note below -->
  data-year="2024"
  data-status="completed"
  data-title="schoolRISCV — a teaching CPU, step by step"
>
  <h1 data-pagefind-meta="title">schoolRISCV — a teaching CPU, step by step</h1>

  <!-- row data carried as meta, so results render without a second fetch -->
  <span data-pagefind-meta="summary">…</span>
  <span data-pagefind-meta="year">2024</span>
  <span data-pagefind-meta="semester">fall</span>
  <span data-pagefind-meta="status">completed</span>
  <span data-pagefind-meta="hasVideo">1</span>
  <img data-pagefind-meta="image[src], image_alt[alt]" src="…" alt="…" />

  <!-- multi-valued facet: one tagged element per value -->
  <ul class="sr-only" aria-hidden="true">
    <li data-pagefind-filter="tag">riscv</li>
    <li data-pagefind-filter="tag">cpu</li>
    <li data-pagefind-filter="tag">fpga</li>
  </ul>
</article>
```

Three things worth calling out:

- **`tags` is the only multi-valued filter now.** Pagefind takes one value per tagged element, so we
  emit a visually-hidden `<ul>`. It is `aria-hidden="true"` as well as `sr-only`, because it is
  machine data, not content for a screen reader — the visible chips already convey it.
- **`image` meta must be the *stub* when a project has no cover** (D21), not omitted. A result with
  no thumbnail would break the row alignment the whole layout depends on.
- Anything findable by text must sit inside `data-pagefind-body`: title, summary, tags, stack,
  hardware, awards, **team member names**, and the prose. Member names are the reason the removed
  team facet costs nothing.

## 3. Client wrapper — `src/lib/search.ts`

```ts
// Pagefind is generated at build time and lives outside Vite's module graph.
// The @vite-ignore comment and the runtime-built path are both required.
const path = '/pagefind/pagefind.js';
const pagefind = await import(/* @vite-ignore */ path);
await pagefind.options({ excerptLength: 25 });
await pagefind.init();
```

Public surface — the **only** module that knows Pagefind exists:

```ts
export type Facets = { tags: string[]; year: string[]; status: string[] };
export type Sort = 'newest' | 'oldest' | 'title' | 'relevance';

export type ProjectResult = {
  url: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  tags: string[];
  year: number;
  semester?: string;
  status: string;
  hasVideo: boolean;
};

export async function query(q: string, facets: Facets, sort: Sort): Promise<ProjectResult[]>;
export async function counts(facets: Facets): Promise<Record<keyof Facets, Record<string, number>>>;
export function isAvailable(): boolean;   // false in dev without a built index
```

Implementation notes:

- **Empty query is the normal case.** `pagefind.search(null, { filters })` returns everything matching
  the filters — that is how pure filtering works and it is the page's default state.
- Results are lazy: `search()` returns stubs, `await result.data()` fetches the fragment. With
  pagination gone (D22) the explorer materializes results in a first batch of ~30 and the rest on
  idle, rather than all at once on a filter change.
- Facet counts come from the `filters` object on the search response, so counts reflect the *other*
  active filters — which is why chips can grey out accurately.
- Sorting uses `data-pagefind-sort`. Pagefind applies sort **instead of** relevance ranking, so when
  the visitor has typed a query the default sort switches to `relevance` and the control gains a
  "Best match" option. Sorting by date while text-searching buries the best hit.

### Degraded mode

`isAvailable()` returns false when `/pagefind/pagefind.js` 404s. The explorer then filters the
server-rendered DOM using the `data-*` attributes already on each row, and disables only the text
input with an inline explanation. This keeps `astro dev` usable and means a broken Pagefind step
degrades the page instead of blanking it.

With no pagination, degraded mode is close to full fidelity: the complete list is already in the DOM,
so tag/year/status filtering is exact. Only free-text ranking is missing.

## 4. URL state — `src/lib/url-state.ts`

Canonical query string:

```
/club/projects?q=riscv&tags=cpu,fpga&year=2024&status=completed&sort=newest
```

Note what is **absent**: no `team=` (D7), no `page=` (D22).

Rules:

| Rule | Reason |
|---|---|
| Keys are omitted when at their default | Clean, shareable URLs; `/club/projects` stays `/club/projects` |
| Multi-value keys are comma-joined, values sorted alphabetically | The same filter set always produces the same URL |
| Filter changes use `history.replaceState` | Doesn't flood browser history while clicking chips |
| "Clear all" uses `pushState` | Back after a clear restores the previous filter set |
| `popstate` re-hydrates state from the URL | Back/forward restore the exact view |
| Unknown or invalid values are dropped, not errored | A stale shared link still renders something sane |
| Scroll position is restored on `popstate` | Returning from a project keeps the visitor's place |

Initial state is parsed from `location.search` **before first paint** of the island, so a shared
filtered link never flashes the unfiltered list.

Round-trip invariant, unit-tested: `parse(serialize(state)) === state` for every valid state, and
`serialize(parse(s))` is stable for every string `s` the app itself produces.

## 5. No pagination (D22)

At ~20 projects growing by ~8/year, the whole list is one page.

- The server renders **every** non-draft project. `/club/projects/page/[n]` does not exist, and
  `?page=` is not a recognised parameter.
- `content-visibility: auto` plus `contain-intrinsic-size` on each row keeps layout and paint cheap
  regardless of count; only rows near the viewport are rendered.
- Thumbnails below the fold are `loading="lazy"`.

Revisit past **~150 projects** — roughly 2040 at the current rate — or sooner if the page's
`Total Blocking Time` regresses past the budget in `07-seo.md` §5. The insulation for that day is
that pagination would be added inside `ProjectExplorer` and `url-state.ts` only; nothing else assumes
a single page.

> Alternatives considered and rejected: infinite scroll (breaks the back button, hides the total) and
> a 24-per-page paginator (three pages of content behind machinery that would need maintaining for a
> decade before it earned itself).

## 6. Tests

Run against `dist/` after a build. Minimal but non-optional:

1. `dist/pagefind/pagefind.js` exists and is non-empty.
2. Every `dist/club/projects/*/index.html` contains `data-pagefind-body` and all **three** filter names.
3. `dist/club/projects/index.html` contains `data-pagefind-ignore`.
4. A headless query for a known project title returns that project as the first result.
5. `/club/projects` with JS disabled renders **every** non-draft project as a real link — count the
   `<a>` elements and compare against `getCollection('projects')` length.
6. Every rendered row has a thumbnail `src` (catches a project with no cover falling through the stub).

Tests 2 and 5 are the ones that catch silent breakage: 2 for the markup contract, 5 for the "the
island swallowed the server-rendered list" failure that only shows up with JS off.

## 7. If we ever outgrow Pagefind

`src/lib/search.ts` is the only module that knows Pagefind exists. Swapping engines means
reimplementing `query()`/`counts()` against the same types — the island, the URL sync, the facet UI
and the markup contract are all engine-agnostic. This is the same insulation the original "keep a
path back to Fuse.js" requirement asked for, achieved with one interface instead of two
implementations.
