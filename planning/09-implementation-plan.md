# Implementation Plan

Nine phases. Each ends in something demonstrable. Phases 1–3 are the critical path; nothing after
phase 4 is blocked by content being finished.

Effort figures assume one developer working part-time and are ranges, not commitments. They are
**lower than the first draft** because four decisions removed work: no pagination (D22), three facets
instead of four (D7), Preact instead of React (D11, no size-budget fights), and no full member roster
(D8).

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

- [ ] Install the stack from `01-architecture.md` §1 at the pinned versions. Note `@astrojs/preact`
      with `compat: true`, **not** `@astrojs/react`.
- [ ] `src/lib/routes.ts` **first** — before any page exists. Every link in the codebase goes through
      it, and retrofitting it after 40 components is miserable.
- [ ] `src/data/site.ts` from `11-club-data.md` §10.
- [ ] `global.css` with the full `@theme` token block incl. tag colours; verify every contrast pair
      in `06` §1.
- [ ] Fonts API, `local` provider, three variable woff2 committed and preloaded.
- [ ] `BaseLayout`, then `ClubLayout` and `PortalLayout` on top of it; `Header`, `Footer`,
      `MobileNav` (inline script, no framework), `ThemeToggle` with no-flash inline script, `SkipLink`.
- [ ] The ~16 UI primitives from `06` §4, built in isolation on a scratch `/styleguide` route.
- [ ] `astro-icon` with a local Iconify set; favicon and manifest set generated from `logo.svg`.

⚠️ **Blocked on the logo** (`11-club-data.md` §1, `06` §7): an SVG or transparent PNG ≥512px. A JPG
cannot produce `favicon.svg` or a usable OG template. Everything else in this phase can proceed
against a placeholder mark.

**Done when:** `/styleguide` shows every primitive in light and dark, keyboard-navigable, zero JS
shipped. **This phase is the highest-leverage one** — everything after it is assembly.

## Phase 2 — Content model *(~1 day)*

- [ ] `src/content.config.ts` with all schemas from `02-content-model.md` §2 — note the optional
      `cover` with the `coverAlt` refinement, the `idea|in-progress|completed|archived` status, and
      `spring|fall|summer`.
- [ ] `people.yaml`, `tags.yaml` (the 11 seeded tags), `services.yaml`, `equipment.yaml`,
      `resources.yaml`.
- [ ] `src/lib/validate.ts` — all six build-time assertions from `02` §2, each naming the file.
- [ ] `templates/project/` scaffold + a `CONTRIBUTING.md` section for student authors.
- [ ] **3–5 real projects entered**, with real images and a real video, before any project UI is
      built. Seed from the GitHub org list in `11-club-data.md` §7 — pick ones with range, not four
      games.

**Done when:** a deliberately broken frontmatter fails the build with a useful message naming the file.

> Sequencing note: entering real content *before* building the project pages is deliberate. Layouts
> designed against placeholder text break on the first real 90-character project title — and this
> club has one (`schoolRISCV — a teaching CPU, step by step`).

## Phase 3 — Project pages *(~2 days)*

- [ ] `ProjectLayout` and the full detail page per `05` §6.
- [ ] `ProjectCover` (cover-or-stub, D21) — **build this before anything that shows a thumbnail**, so
      the fallback can't be forgotten in one place and remembered in another.
- [ ] `ProjectRow`, `ProjectCard`, `TeamCredits` (plain text or external link — **no `?team=`**),
      `LinksBox`, `TechBox`, `AwardsBox`, `RelatedProjects` (build-time tag overlap).
- [ ] `src/lib/video.ts` with **all four** provider parsers and one unit test each; `VideoFacade`
      with its inline click handler and no-JS `<a href>` fallback.
- [ ] `Figure`, `Gallery`, and the `copy-originals` integration writing `manifest.json`.
- [ ] `Lightbox` island (Preact): native `<dialog>`, focus trap, arrow keys, "View original (N MB)".
      No URL state (D28).
- [ ] Shiki grammars for `verilog` / `systemverilog` — the code blocks are the substance here.

**Done when:** every seeded project renders correctly, the gallery works with JS **and** with JS
disabled, the facade links out with JS disabled and plays inline with JS on, and a project with no
cover and no video renders without a hole.

## Phase 4 — Directory, search, filtering *(~2 days)*

The most technically involved phase, but smaller than first estimated — no pagination, one fewer
facet. Build in this order; each step is independently verifiable:

1. [ ] Server-rendered **complete** row list at `/club/projects`, newest-first (D20/D22).
2. [ ] Pagefind markup contract on `/club/projects/<slug>`; `data-pagefind-ignore` on the index page.
3. [ ] `pagefind --site dist --glob "club/projects/**/*.html"` wired into `pnpm build`; smoke tests
       1–6 from `03` §6.
4. [ ] `src/lib/search.ts` — the Pagefind wrapper, plus degraded mode.
5. [ ] `src/lib/url-state.ts` — parse, serialize, `replaceState`/`pushState`, `popstate`, with the
       round-trip unit test.
6. [ ] `ProjectExplorer` island: query box, **three** facet groups with live counts, sort,
       active-filter bar, empty state, `aria-live` count.

**Done when:** a filtered URL pasted into a fresh tab reproduces the exact view; back/forward behave;
and `/club/projects` with JS disabled lists and links **every** project (smoke test 5).

## Phase 5 — Remaining pages *(~1.5 days)*

- [ ] `/` — the portal (D19). Small, and worth doing early because it is the first thing anyone
      following the domain will see.
- [ ] `/club` per `05` §4, with **derived** stats and the featured-row fallback.
- [ ] `/club/about`, `/club/join`, `/club/contact` from MDX + `site.ts`. Use the draft copy in `05`
      §9 and §12 as a starting point — **the leader must read it before it ships**.
- [ ] `/club/events` — flat reverse-chronological list with the standing recurrence line, **no dated
      banner** (D26). The three seed entries ship `draft: true`.
- [ ] `/club/equipment` (D31) — `EquipmentRow` on top of `ProjectRow`/`ProjectCover`; route and nav
      item **not generated at all** when `equipment.yaml` is empty.
- [ ] `/club/resources` — "Services built by us" + grouped links; empty sections render nothing.
- [ ] Partners block on `/club/about` (D32), including the invitation card gated on ≥1 real partner.
- [ ] `/404` — must work from both zones.

**Done when:** every route in `05` §1 exists, every nav link resolves, and no page contains a
club fact that isn't in `site.ts` or a content file.

## Phase 6 — SEO & metadata *(~1 day)*

- [ ] `<Seo>` component with the typed props from `07` §1; every page supplies them.
- [ ] `/og/[slug].png.ts` — satori + resvg, fonts loaded as buffers; plus `og-default.png` and
      `og-portal.png`.
- [ ] JSON-LD builders for all types in `07` §3, incl. `SoftwareSourceCode` with
      `programmingLanguage` and `codeRepository`.
- [ ] `@astrojs/sitemap` with exclusions; **generated** `robots.txt` carrying the absolute sitemap URL.

**Done when:** three project URLs preview correctly **in Telegram** (the club's actual channel, and
the surface these images exist for), and Google's Rich Results test validates `SoftwareSourceCode`
and `VideoObject`.

## Phase 7 — Deployment *(~1 day)*

- [ ] `Dockerfile`, `Caddyfile`, `docker-compose.yml`, `.dockerignore`, `.env.example` per `08`.
- [ ] Verify all three Caddy modes, and that the `Content-Type`-based HTML cache matcher actually
      catches extensionless directory URLs.
- [ ] CSP generated from the providers present in content; ship **report-only** first (D29).
- [ ] `DEPLOY.md`: the exact commands the next club leader runs, assuming no prior context.

⚠️ **Blocked on D30** — the canonical domain. Everything else in this phase can be built and tested
against `SITE_URL=http://localhost:8080`; only the production build needs the decision.

**Done when:** `docker compose up -d --build` on a clean machine produces the working site, and the
built HTML carries the production domain in canonical, sitemap, robots and OG URLs.

## Phase 8 — Content load & launch *(~2–4 days, mostly writing)*

- [ ] Remaining ~15 projects entered from the GitHub org (`11-club-data.md` §7).
- [ ] `people.yaml` — **only people who have consented** (`02` §5, `11` §9).
- [ ] Real About/Join/Contact/Resources copy replacing the drafts; real curated links (C5).
- [ ] Real `equipment.yaml` — until it has rows, `/club/equipment` doesn't exist.
- [ ] Real event entries replacing the three `draft: true` templates.
- [ ] Awards filled in once the 2024 SoC Design Challenge track and placement are confirmed.
- [ ] Accessibility pass: keyboard-only walkthrough, screen-reader spot-check, contrast re-verify.
- [ ] Lighthouse against the budgets in `07` §5 — including "0 third-party requests before
      interaction" on every route.
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

**~11 developer-days** of build work, plus content writing. Roughly 3–4 calendar weeks part-time.
Down from ~13 because of D7, D11, D20 and D22.

## What's blocked on whom

| Blocker | Owner | Blocks | Latest it can land |
|---|---|---|---|
| Logo as SVG / transparent PNG | leader | favicon set, OG template, portal cards | start of phase 1 |
| Canonical domain (D30) | leader + university IT | production build only | start of phase 7 |
| One real sentence each for VCD and HW | leader | portal, header, `/club/resources` | phase 5 |
| **Equipment list** (name, line, link, photo per item) | leader | `/club/equipment` exists at all | phase 5 |
| Curated links (C5) | leader | `/club/resources` sections | phase 5 |
| 2024 competition track / placement / team | leader | `/club/about` awards | phase 8 |
| ADV-T credit wording + relationship | leader | `/club/about` partners | phase 8 |
| Approval of drafted mission and `/join` copy | leader | `/club/about`, `/club/join` | phase 5 |

**Phases 0–4 are entirely unblocked.** That is over half the build.

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Pagefind's dev-mode absence frustrates iteration | Medium | Degraded mode + `pnpm search:dev`, built in phase 4 step 4 |
| `sharp`/`resvg` binaries fail on Alpine | Medium | Switch build stage to `node:24-slim`; one-line fix, flagged in `08` §3 |
| A video provider changes its embed URL format | Medium | Per-provider unit tests fail loudly; fix is one regex. Higher now that all four are live (D10) |
| Repo bloat from committed originals | Low→High over years | Monitor; move to Git LFS past ~500 MB (`04` §A5) |
| Half the directory ends up as stub covers | **Medium** | The stub makes it *uniform*, not *good* — `templates/project/` must ask for one photo, and phase 2's seed projects should all have real ones |
| Drafted copy ships unread | **Medium** | Everything I wrote is marked 🟡 and the seed events are `draft: true`; nothing invented can reach production by accident |
| Content never gets written | **High** | Start phase 8 during phase 2; seed 3–5 real projects early |
| Bus factor — one person knows the stack | **High** | `DEPLOY.md` + `CONTRIBUTING.md` are deliverables, not afterthoughts |
| Student consent for photos/names not recorded | Medium | Only `name` is required (D8); consent is in-person per `11` §9; resolve before phase 8 |

The last two are the ones that actually kill student-club websites. A site nobody but the author can
deploy or add a project to is dead the semester after they graduate — which is why the authoring
template, the build-time validation with useful error messages, and `DEPLOY.md` are in scope rather
than "nice to have". This matters more than usual here: the club runs on a rotating student
population with an annual intake, and the person who builds this site will graduate.
