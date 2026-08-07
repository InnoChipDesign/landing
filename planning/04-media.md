# Media — Images and Video

## Part A — Images

Implements D9: originals committed, optimized variants inline, original behind an explicit download
link with its size stated.

### A1. Pipeline

```
src/content/projects/rover-2025/rig.jpg        4000×3000, 11.4 MB, committed
        │
        ├── astro:assets (sharp) ─────────► dist/_astro/rig.<hash>.avif   400 800 1200 1600w
        │                                   dist/_astro/rig.<hash>.webp   (fallback ladder)
        │                                   dist/_astro/rig.<hash>-lg.webp 2000w  (lightbox)
        │
        └── copy-originals integration ───► dist/originals/rover-2025/rig.jpg  (byte-identical)
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

### A2. `copy-originals` integration

A ~40-line local integration (`src/integrations/copy-originals.ts`) hooked on `astro:build:done`:

1. Walk `src/content/projects/*/`.
2. Copy every image file to `dist/originals/<slug>/<filename>` unchanged.
3. Record `{ slug, filename, bytes }` into `dist/originals/manifest.json`.

The manifest is what lets the lightbox say **"View original (11.4 MB)"** instead of an unlabelled
link. A visitor on mobile data deserves to know before tapping.

> Why an integration rather than putting originals in `public/`? `public/` would duplicate every
> image in the repo (once for the build pipeline, once verbatim), doubling repo size and letting the
> two copies drift. One source file, two outputs.

### A3. Components

**`<Figure>`** — a single image with optional caption.
Renders `<picture>` with AVIF → WebP → original-format fallback, plus caption in `<figcaption>`.

**`<Gallery>`** — the grid under a project body. Server-rendered as a plain responsive grid of
`<a href="/originals/…">` wrapping each thumbnail. With JS, the `Lightbox` island intercepts the
click. **Without JS the link still works** — it just opens the original file directly. The gallery is
never blank and never dead.

**`<Lightbox>` island** (React, `client:visible`):

```
┌────────────────────────────────────────────────┐  Esc / click backdrop closes
│  ←            [ 2000px optimized image ]     → │  ← → arrows, swipe on touch
│                                                │  focus trapped in dialog
│  Chassis v2 · 3 of 7                           │  native <dialog>, role=dialog
│  ⬇ View original  (JPEG, 4000×3000, 11.4 MB)   │  ← opens dist/originals/…
└────────────────────────────────────────────────┘
```

Accessibility requirements (all mandatory):
- Native `<dialog>` element with `showModal()` — gives focus trapping and `Esc` for free.
- Focus returns to the thumbnail that opened it on close.
- Body scroll locked while open.
- Arrow-key navigation, and `aria-label`s on the controls.
- The image's `alt` comes from the gallery entry, not from the filename.

`?image=<n>` is **not** synced to the URL — the lightbox is transient UI, and adding it to the query
string would collide with the back-button semantics established for `/projects`.

### A4. Rules for contributors

| Rule | Why |
|---|---|
| Commit the original, don't pre-resize | The build produces better variants than a manual export |
| Keep originals under ~15 MB each | Git repo health; use JPEG quality ~90, not PNG, for photos |
| Screenshots as PNG, photos as JPEG | sharp handles both; wrong format triples the original size |
| `alt` describes the content, not "photo of…" | Screen-reader quality; also feeds image search |
| No text baked into images | Unreadable when scaled, invisible to search |

A `git` note: images are binary and permanent in history. If the repo passes ~500 MB, move originals
to Git LFS — the pipeline is unaffected. Flagged now so it's a deliberate choice later, not a crisis.

---

## Part B — Video

Implements D10: one provider at a time, but which provider may change.

### B1. Provider adapter — `src/lib/video.ts`

```ts
export type Provider = 'youtube' | 'rutube' | 'vk' | 'dzen';

export type Embed = {
  provider: Provider;
  embedUrl: string;
  aspect: number;        // 16/9 default
  title: string;         // required for the iframe's accessible name
};

export function parseVideoUrl(url: string): Embed;   // throws at build time on unknown URL
```

Recognized input forms per provider:

| Provider | Accepted URL shapes | Embed form |
|---|---|---|
| YouTube | `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID` | `https://www.youtube-nocookie.com/embed/ID` |
| Rutube | `rutube.ru/video/ID/` | `https://rutube.ru/play/embed/ID` |
| VK Video | `vk.com/video-OID_VID`, `vkvideo.ru/video-OID_VID` | `https://vk.com/video_ext.php?oid=-OID&id=VID&hd=2` |
| Dzen | `dzen.ru/video/watch/ID` | `https://dzen.ru/embed/ID` |

Two deliberate design points:

1. **Parsing happens at build time**, inside the collection's transform. A malformed or unsupported
   video URL fails the build with the offending file path, rather than rendering an empty black box in
   production that nobody notices for a month.
2. Adding a fifth provider is one entry in a table plus one regex — it never touches a component.
   That is the whole cost of the "provider may vary" requirement.

> Note on VK and Dzen embed URLs: these are the current documented forms, but neither provider
> publishes a stability guarantee. `parseVideoUrl` is unit-tested per provider so a format change
> surfaces as a failing test rather than a broken page.

### B2. `<VideoEmbed>` component

Zero JavaScript. Astro component only.

```html
<figure class="video">
  <div style="aspect-ratio: 16 / 9">
    <iframe
      src="{embedUrl}"
      title="{videoTitle}"                     <!-- required: accessible name -->
      loading="lazy"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
  <figcaption>…optional…</figcaption>
</figure>
```

- Wrapped in an `aspect-ratio` box so the player reserves its space before load — no layout shift.
- `loading="lazy"` means the provider is not contacted until the iframe approaches the viewport.
  Since projects carry at most one video and it sits high on the page, the practical effect is small,
  but it costs nothing.
- YouTube uses the `-nocookie` domain. It is not true privacy, but it is strictly better than the
  default and free to adopt.

**Honest note on privacy:** a direct iframe means the provider can see the visitor's IP and set
storage as soon as the embed loads. A click-to-load facade (poster image, iframe injected on click)
would avoid that entirely. It was considered and not chosen — recorded here so the trade-off is
visible if the university ever asks about third-party tracking. Switching to a facade later is
contained to `<VideoEmbed>` plus a poster field in the schema.

### B3. Content Security Policy interaction

Because embeds are iframes from a third-party host, the CSP shipped by Caddy (see `08-deployment.md`)
must allow `frame-src` for exactly the provider in use — not `*`. The provider list lives in one
place (`src/lib/video.ts`) and the CSP is generated from it, so the two cannot drift apart.

### B4. Placement

On a project page the video sits **directly under the summary**, above the body prose — demos are the
reason visitors came. If a project has no video, the hero image takes that slot; the layout does not
leave a hole.
