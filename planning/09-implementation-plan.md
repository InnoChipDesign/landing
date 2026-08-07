# Implementation Plan

Nine phases. Each ends in something demonstrable. Phases 1–3 are the critical path; nothing after
phase 4 is blocked by content being finished.

Effort figures assume one developer working part-time and are ranges, not commitments.

---

## Phase 0 — Clear the ground *(~0.5 day)*

The working tree still holds a deleted Next.js/shadcn app and a `.github/workflows/` file that
contradicts the "no hosting provider binding" requirement.

- [ ] Commit the deletions on the `rework` branch so the history is honest about the reset.
- [ ] Delete `.github/workflows/docker-build-push-to-ghcrio.yaml` (D14/§9 — no CI, no registry).
- [ ] New `.gitignore` for Astro: `dist/`, `.astro/`, `node_modules/`, `.env`, `public/pagefind/`.
- [ ] `pnpm create astro` scaffold, TypeScript `strict`, `git` history preserved.

**Done when:** `pnpm dev` serves an empty Astro site and the repo contains nothing from the old stack.

## Phase 1 — Foundations *(~1.5 days)*

- [ ] Install the stack from `01-architecture.md` §1 at the pinned versions.
- [ ] `global.css` with the full `@theme` token block; verify every contrast pair in `06` §1.
- [ ] Fonts API, `local` provider, three variable woff2 committed and preloaded.
- [ ] `BaseLayout` + `PageLayout`, `Header`, `Footer`, `MobileNav` (inline script, no React),
      `ThemeToggle` with no-flash inline script, `SkipLink`.
- [ ] The ~15 UI primitives from `06` §4, built in isolation on a scratch `/styleguide` route.
- [ ] `astro-icon` with a local Iconify set; favicon and manifest set generated from the logo SVG.

**Done when:** `/styleguide` shows every primitive in light and dark, keyboard-navigable, zero JS
shipped. **This phase is the highest-leverage one** — everything after it is assembly.

## Phase 2 — Content model *(~1 day)*

- [ ] `src/content.config.ts` with all schemas from `02-content-model.md`.
- [ ] `people.yaml`, `tags.yaml`, `services.yaml`, `resources.yaml` with real (or clearly-marked
      placeholder) data.
- [ ] Build-time validators: tag vocabulary, `primary` service count ≤ 2, video URL parsing.
- [ ] `templates/project/` scaffold + a `CONTRIBUTING.md` section for student authors.
- [ ] **3–5 real projects entered**, with real images and a real video, before any project UI is built.

**Done when:** a deliberately broken frontmatter fails the build with a useful message naming the file.

> Sequencing note: entering real content *before* building the project pages is deliberate. Layouts
> designed against placeholder text break on the first real 90-character project title.

## Phase 3 — Project pages *(~2 days)*

- [ ] `ProjectLayout` and the full detail page per `05` §5.
- [ ] `ProjectCard`, `TeamCredits` (chips → `/projects?team=<id>`), `LinksBox`, `TechBox`,
      `AwardsBox`, `RelatedProjects` (build-time tag overlap).
- [ ] `VideoEmbed` + `src/lib/video.ts` with the four provider parsers and their unit tests.
- [ ] `Figure`, `Gallery`, and the `copy-originals` integration writing `manifest.json`.
- [ ] `Lightbox` island: native `<dialog>`, focus trap, arrow keys, "View original (N MB)".

**Done when:** every seeded project renders correctly, the gallery works with JS **and** with JS
disabled, and the video plays.

## Phase 4 — Directory, search, filtering *(~2.5 days)*

The most technically involved phase. Build it in this order — each step is independently verifiable:

1. [ ] Server-rendered full grid at `/projects`, newest-first, with `/projects/page/[n]`.
2. [ ] Pagefind markup contract on `/projects/<slug>`; `data-pagefind-ignore` on the index page.
3. [ ] `pagefind --site dist --glob "projects/**/*.html"` wired into `pnpm build`; the five smoke
       tests from `03` §6.
4. [ ] `src/lib/search.ts` — the Pagefind wrapper, plus degraded mode.
5. [ ] `src/lib/url-state.ts` — parse, serialize, `replaceState`/`pushState`, `popstate`.
6. [ ] `ProjectExplorer` island: query box, four facet groups with live counts, sort, active-filter
       bar, empty state, `aria-live` count.
7. [ ] Client-side pagination.

**Done when:** a filtered URL pasted into a fresh tab reproduces the exact view; back/forward behave;
and `/projects` with JS disabled still lists and links every project.

## Phase 5 — Remaining pages *(~1.5 days)*

- [ ] `/` per `05` §3, with **derived** stats and the featured-row fallback.
- [ ] `/about`, `/join`, `/contact` from MDX + `site.ts`.
- [ ] `/events` — flat reverse-chronological list, pinned "next meeting" banner.
- [ ] `/resources` — "Services built by us" section + grouped links.
- [ ] `/404`.

**Done when:** every route in `05` §1 exists and every nav link resolves.

## Phase 6 — SEO & metadata *(~1 day)*

- [ ] `<Seo>` component with the typed props from `07` §1; every page supplies them.
- [ ] `/og/[slug].png.ts` — satori + resvg, fonts loaded as buffers.
- [ ] JSON-LD builders for all types in `07` §3.
- [ ] `@astrojs/sitemap` with exclusions; generated `robots.txt` carrying the absolute sitemap URL.

**Done when:** three project URLs produce correct previews in a link-preview debugger, and Google's
Rich Results test validates the `CreativeWork` and `VideoObject` markup.

## Phase 7 — Deployment *(~1 day)*

- [ ] `Dockerfile`, `Caddyfile`, `docker-compose.yml`, `.dockerignore`, `.env.example` per `08`.
- [ ] Verify all three Caddy modes.
- [ ] CSP generated from the provider table; ship **report-only** first.
- [ ] `DEPLOY.md`: the exact commands the next club leader runs, assuming no prior context.

**Done when:** `docker compose up -d --build` on a clean machine produces the working site, and the
built HTML contains the production domain in canonical, sitemap and OG URLs.

## Phase 8 — Content load & launch *(~2–4 days, mostly writing)*

- [ ] All remaining projects entered.
- [ ] Full `people.yaml` roster — **only people who have consented** (`02` §5).
- [ ] Real About/Join/Contact/Resources copy; real form and chat links.
- [ ] Accessibility pass: keyboard-only walkthrough, screen-reader spot-check, contrast re-verify.
- [ ] Lighthouse against the budgets in `07` §5.
- [ ] Release checklist `08` §8; deploy; enforce CSP after a week of clean reports.

---

## Critical path

```
Phase 0 → 1 → 2 → 3 → 4 ─┐
                          ├→ 7 → 8
              5 ──── 6 ───┘
```

Phases 5 and 6 can proceed in parallel with 4 once phase 3 is done. Content writing (phase 8) can
start any time after phase 2 and should — it is usually the real bottleneck, not the code.

## Estimate

**~13 developer-days** of build work, plus content writing. Roughly 3–5 calendar weeks part-time.

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Pagefind's dev-mode absence frustrates iteration | Medium | Degraded mode + `pnpm search:dev`, built in phase 4 step 4 |
| `sharp`/`resvg` binaries fail on Alpine | Medium | Switch build stage to `node:24-slim`; one-line fix, flagged in `08` §3 |
| Video provider changes its embed URL format | Medium | Per-provider unit tests fail loudly; fix is one regex |
| Repo bloat from committed originals | Low→High over years | Monitor; move to Git LFS past ~500 MB (`04` §A4) |
| Content never gets written | **High** | Start phase 8 during phase 2; seed 3–5 real projects early |
| Bus factor — one person knows the stack | **High** | `DEPLOY.md` + `CONTRIBUTING.md` are deliverables, not afterthoughts |
| Student consent for photos/names not recorded | Medium | Resolve before phase 8; see `10-open-questions.md` |

The last two are the ones that actually kill student-club websites. A site nobody but the author can
deploy or add a project to is dead the semester after they graduate — which is why the authoring
template, the build-time validation with useful error messages, and `DEPLOY.md` are in scope rather
than "nice to have".
