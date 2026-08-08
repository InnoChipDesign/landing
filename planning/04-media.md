# Media — Images and Video

## Part A — Images

Implements D9 (originals committed, optimized variants inline, original behind a labelled link) and
D21 (cover optional, shared stub).

### A1. Pipeline

```
src/content/projects/school-riscv/board.jpg    4000×3000, 11.4 MB, committed
        │
        ├── astro:assets (sharp) ─────────► dist/_astro/board.<hash>.avif   400 800 1200 1600w
        │                                   dist/_astro/board.<hash>.webp   (fallback ladder)
        │                                   dist/_astro/board.<hash>-lg.webp 2000w  (lightbox)
        │
        └── copy-originals integration ───► dist/originals/school-riscv/board.jpg (byte-identical)
```

`astro.config.mjs`:

```js
image: {
  responsiveStyles: true,
  layout: 'constrained',
  objectFit: 'cover',
  breakpoints: [400, 640, 800, 1200, 1600, 2000],
}
```

Every `<img>` gets explicit `width`/`height`, `loading="lazy"` (except the LCP image, which is
`loading="eager" fetchpriority="high"`), `decoding="async"` and a real `alt`. Zero CLS is a
requirement, not a goal.

### A2. Cover stub (D21)

`cover` is optional. When absent, `<ProjectCover>` renders a generated placeholder rather than
leaving a hole — the row list depends on every row having the same left column.

Specification:

```
┌──────────────────┐   4:3, same box as a real cover
│                  │   background: tinted surface, hue derived deterministically
│       ◆          │            from the slug (stable across builds — the same
│                  │            project always gets the same tint)
│   schoolRISCV    │   club mark centred, project title beneath in --font-display,
│                  │            clamped to 2 lines
└──────────────────┘   alt="" — decorative; the title is already the adjacent link text
```

- **Rendered as inline SVG, not a raster file.** ~400 bytes, needs no image pipeline pass, scales to
  any slot, and picks up theme tokens so it is correct in dark mode without a second asset.
- Hue: `hash(slug) % 360`, clamped to the palette's saturation/lightness so no stub ever fights the
  accent colour. Deterministic, so a project doesn't change colour between deploys.
- `alt=""` and `aria-hidden="true"`. The stub carries no information the surrounding text lacks, and
  announcing "placeholder image" to a screen-reader user is noise.
- **The stub is still emitted as the Pagefind `image` meta** (`03-search-and-filtering.md` §2), as a
  data URI, so client-rendered results align with server-rendered ones.

One consequence to accept: a directory where half the rows are stubs looks like a directory of
half-finished projects. The stub solves *uniformity*, not *emptiness*. Getting one photo per project
is still worth an hour of somebody's time, and `templates/project/` should say so.

### A3. `copy-originals` integration

A ~40-line local integration (`src/integrations/copy-originals.ts`) hooked on `astro:build:done`:

1. Walk `src/content/projects/*/`.
2. Copy every image file to `dist/originals/<slug>/<filename>` unchanged.
3. Record `{ slug, filename, bytes, width, height, format }` into `dist/originals/manifest.json`.

The manifest is what lets the lightbox say **"View original (JPEG, 4000×3000, 11.4 MB)"** instead of
an unlabelled link. A visitor on mobile data deserves to know before tapping.

> Why an integration rather than putting originals in `public/`? `public/` would duplicate every
> image in the repo (once for the build pipeline, once verbatim), doubling repo size and letting the
> two copies drift. One source file, two outputs.

### A4. Components

**`<ProjectCover>`** — cover or stub. Every surface that shows a project thumbnail goes through this,
so the fallback can never be forgotten in one place and remembered in another.

**`<Figure>`** — a single image with optional caption. Renders `<picture>` with AVIF → WebP →
original-format fallback, plus caption in `<figcaption>`.

**`<Gallery>`** — the grid under a project body. Server-rendered as a plain responsive grid of
`<a href="/originals/…">` wrapping each thumbnail. With JS, the `Lightbox` island intercepts the
click. **Without JS the link still works** — it just opens the original file directly. The gallery is
never blank and never dead.

**`<Lightbox>` island** (Preact, `client:visible`):

```
┌────────────────────────────────────────────────┐  Esc / click backdrop closes
│  ←            [ 2000px optimized image ]     → │  ← → arrows, swipe on touch
│                                                │  focus trapped in dialog
│  Single-cycle datapath · 3 of 7                │  native <dialog>, role=dialog
│  ⬇ View original  (JPEG, 4000×3000, 11.4 MB)   │  ← opens dist/originals/…
└────────────────────────────────────────────────┘
```

Accessibility requirements (all mandatory):
- Native `<dialog>` with `showModal()` — gives focus trapping and `Esc` for free.
- Focus returns to the thumbnail that opened it on close.
- Body scroll locked while open.
- Arrow-key navigation, and `aria-label`s on the controls.
- The image's `alt` comes from the gallery entry, not from the filename.

**`?image=<n>` is not synced to the URL** (D28). The full reasoning is in the decision log; the short
version is that a history entry per gallery click makes leaving a project take eight Backs, and a
shared `?image=3` link breaks the moment the gallery is reordered. The permanent, shareable URL for a
specific image is the "View original" link, which points at an actual file.

### A5. Rules for contributors

| Rule | Why |
|---|---|
| Commit the original, don't pre-resize | The build produces better variants than a manual export |
| Keep originals under ~15 MB each | Git repo health; use JPEG quality ~90, not PNG, for photos |
| Screenshots as PNG, photos as JPEG | sharp handles both; the wrong format triples the original size |
| `alt` describes the content, not "photo of…" | Screen-reader quality; also feeds image search |
| No text baked into images | Unreadable when scaled, invisible to search |
| One cover photo beats a perfect one | The stub is a floor, not a target |

A `git` note: images are binary and permanent in history. At ~8 projects a year with a handful of
photos each, the repo grows slowly — but if it passes ~500 MB, move originals to Git LFS; the
pipeline is unaffected. Flagged now so it's a deliberate choice later, not a crisis.

---

## Part B — Video

Implements D10 as revised: **all four providers are first-class**, and every embed is a
**click-to-load facade**.

### B1. Provider adapter — `src/lib/video.ts`

The "single provider at a time" narrowing was withdrawn — the host is not fixed and may differ per
project. All four parsers are written and tested up front. This is one table and four regexes; the
cost of supporting all of them is smaller than the cost of discovering mid-content-load that one
project's demo is on a different site.

```ts
export type Provider = 'youtube' | 'rutube' | 'vk' | 'dzen';

export type Embed = {
  provider: Provider;
  id: string;
  embedUrl: string;      // injected into src on click — never rendered at page load
  watchUrl: string;      // canonical page on the provider; the facade's no-JS fallback
  frameSrcOrigin: string; // contributes to the generated CSP frame-src
  aspect: number;        // 16/9 default
};

export function parseVideoUrl(url: string): Embed;   // throws at build time on unknown URL
export const PROVIDER_ORIGINS: Record<Provider, string>;
```

Recognized input forms:

| Provider | Accepted URL shapes | Embed form | `frame-src` origin |
|---|---|---|---|
| YouTube | `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID` | `https://www.youtube-nocookie.com/embed/ID` | `https://www.youtube-nocookie.com` |
| Rutube | `rutube.ru/video/ID/` | `https://rutube.ru/play/embed/ID` | `https://rutube.ru` |
| VK Video | `vk.com/video-OID_VID`, `vkvideo.ru/video-OID_VID` | `https://vk.com/video_ext.php?oid=-OID&id=VID&hd=2` | `https://vk.com` |
| Dzen | `dzen.ru/video/watch/ID` | `https://dzen.ru/embed/ID` | `https://dzen.ru` |

Two deliberate design points:

1. **Parsing happens at build time**, inside the collection transform. A malformed or unsupported
   video URL fails the build with the offending file path, rather than rendering an empty black box in
   production that nobody notices for a month.
2. Adding a fifth provider is one table entry plus one regex — it never touches a component, and the
   CSP updates itself (§B3).

> Note on VK and Dzen embed URLs: these are the current documented forms, but neither provider
> publishes a stability guarantee. `parseVideoUrl` is unit-tested per provider, so a format change
> surfaces as a failing test rather than a broken page.

### B2. `<VideoFacade>` — click-to-load

Replaces the direct iframe (E2). Until the visitor clicks, **the site makes zero third-party
requests on any page.** No cookie banner is needed, and the CSP's `frame-src` is the only third-party
allowance in the whole policy.

Astro component plus ~15 lines of inline script. **Not an island** — one click handler does not
justify hydrating a framework.

```html
<figure class="video">
  <div class="video__box" style="aspect-ratio: 16 / 9">
    <!-- No-JS and pre-click state: a real link to the provider's page. -->
    <a class="video__facade"
       href="{watchUrl}"
       target="_blank" rel="noopener noreferrer"
       data-embed="{embedUrl}"
       data-title="{videoTitle}"
       aria-label="Play: {videoTitle} (loads {provider})">
      <img src="{poster}" alt="" width="1280" height="720" loading="lazy" decoding="async">
      <span class="video__play" aria-hidden="true">▶︎</span>
      <span class="video__note">Loads from {provider}</span>
    </a>
  </div>
  <figcaption>…optional…</figcaption>
</figure>
```

On click, the script `preventDefault()`s and replaces the `<a>` with:

```html
<iframe
  src="{embedUrl}?autoplay=1"
  title="{videoTitle}"
  referrerpolicy="strict-origin-when-cross-origin"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
  allowfullscreen
></iframe>
```

Requirements:

- **The facade is an `<a href>`, not a `<div onclick>`.** With JS disabled — or before the script
  runs — clicking still takes the visitor to the video on the provider's site. It is keyboard
  focusable and announced correctly for free, with no `role`/`tabindex` patching.
- The `aspect-ratio` box reserves space for both states, so swapping the facade for the iframe causes
  **zero layout shift**.
- `?autoplay=1` is added only on the click-injected iframe, so the video starts on the click the user
  already made. Never on load.
- The "Loads from YouTube" note is visible, not a tooltip. On a site with no other third-party
  requests, telling people what a click costs is the honest default.
- Poster source, in order: `videoPoster` → `cover` → the generated stub (A2). It is **never** fetched
  from the provider's thumbnail API — that would reintroduce exactly the third-party request the
  facade exists to avoid.

Trade-off accepted: one extra click before playback, and the poster is a committed image rather than
the provider's auto-generated frame. In exchange, a visitor who never clicks a video is never seen by
YouTube, VK, Rutube or Dzen.

### B3. Content Security Policy interaction

`frame-src` is **generated**, not hand-written:

1. At build, collect the `frameSrcOrigin` of every video referenced by a non-draft project.
2. Deduplicate; emit the sorted list into the CSP.
3. If no project has a video, `frame-src 'none'`.

So the policy is exactly as wide as the content requires and no wider, it never says `*`, and it
cannot drift from `src/lib/video.ts`. See `08-deployment.md` §6.

### B4. Placement

On a project page the video sits **directly under the summary**, above the body prose — demos are the
reason visitors came. If a project has no video, the cover image takes that slot; the layout does not
leave a hole.

In the directory row list, a project with a video shows a small ▶︎ glyph at the right edge of its row
(`03-search-and-filtering.md` §1) — a one-glance signal, with no media loaded.
