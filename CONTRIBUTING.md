# Contributing

Everything a non-developer edits lives in `src/content/` or `src/data/`. Adding a project, a
person, an event, a service or a resource link should never require touching a component.

## Getting the site running

```bash
pnpm install
pnpm dev            # http://localhost:4321 — portal at /, club at /club
```

## Adding a project

1. Copy `templates/project/` to `src/content/projects/<your-slug>/`.
2. Fill in the frontmatter. The comments in the template explain every field.
3. Put your images in that same folder, at **original resolution** — do not pre-resize them. The
   build produces better variants than a manual export, and it keeps the untouched original
   available behind a "View original" link.
4. Set `draft: false` when the page is finished.
5. Open a pull request.

**The folder name is the slug and it is permanent** — it is in the URL and in every link anyone
shares. Lowercase, hyphens, readable (`school-riscv`, not `project-schoolRISCV`). It does not have
to match the GitHub repo name.

A project with no photos and no video is still publishable: omit `cover`, `gallery` and `video`, and
a generated stub renders in place of the thumbnail. But the stub solves *uniformity*, not
*emptiness* — one photo of the thing working is worth an hour of somebody's time.

### If the build fails

That is the point. A malformed project fails the build instead of shipping a broken page, and every
message names the file:

```
projects/foo/index.mdx: unknown tag "fpgaa" (did you mean "fpga"?) — the vocabulary is src/data/tags.yaml
```

The checks are: every tag exists in `src/data/tags.yaml`; every video URL is a host we can embed
(YouTube, Rutube, VK Video, Dzen); `coverAlt` is present whenever `cover` is; at most two services
are flagged `inHeader`; and every team credit has either a `person` id or a `name`.

## Adding a person

Append to `src/data/people.yaml`. **`name` is the only required field.** Add a field only when the
person has agreed to it being public — this is a public page listing real students. Consent is
recorded in person by the club leader, and removal is actioned promptly as a repository change.

A person can be credited on a project by `name` alone, without an entry in `people.yaml` at all.

## Adding equipment

Append to `src/data/equipment.yaml`. `name` alone is a valid row. While the file is empty the
`/club/equipment` route and its nav item are not generated at all.

## Adding an event

A new `.mdx` file in `src/content/events/`. Keep `draft: true` until it is a record of something
that actually happened.

## Working on search

Pagefind indexes **built HTML**, so its index does not exist under `astro dev`.

```bash
pnpm search:dev     # build once, copy the index into public/pagefind/ (git-ignored)
```

## Before opening a pull request

```bash
pnpm check          # astro check + tsc, zero errors required
pnpm test           # video parsers, route helpers
SITE_URL=http://localhost:4321 pnpm build
```

## House rules for code

- **All internal links go through `src/lib/routes.ts`.** Never string-concatenate `'/club/' + …`;
  one typo'd prefix is invisible until somebody clicks it.
- **No raw hex colours.** Every colour is a token in `src/styles/global.css`, defined for light
  *and* dark. A colour defined only inside `.dark` is a bug waiting to render as black-on-black.
- **No project or equipment thumbnail outside `ProjectCover`.** That component owns the
  cover-or-stub fallback; bypassing it is how "some rows have images and some have holes" ships.
- **There are exactly two Preact islands**, and neither exists yet. Anything interactive that is not
  the project explorer or the lightbox should be an Astro component with a short inline script.
  Adding a third island needs justification in the pull request.
- **No club fact hardcoded in a component.** It belongs in `src/data/site.ts` or a content file.

The reasoning behind all of these is in [`planning/`](planning/) — start with
[`00-decisions.md`](planning/00-decisions.md).
