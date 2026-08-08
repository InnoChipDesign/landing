# Deploying

Written for the next club leader, assuming no prior context. The complete deploy path is two
commands on the club's server. There is no CI, no container registry and no hosting provider — that
is deliberate, so the site outlives any particular platform account.

## What runs

One container. Caddy serving static files, behind the university's existing reverse proxy which
terminates TLS. Stateless and read-only: no database, no volume, no writable path. **Nothing to
back up except this git repository.**

## First deploy

```bash
git clone <this repo> && cd landing
cp .env.example .env
```

Edit `.env` and set `SITE_URL`. Then:

```bash
docker compose up -d --build
```

That's it. The site is on port 8080.

## Updating

```bash
git pull
docker compose up -d --build
```

Tag each deploy so you can roll back:

```bash
docker tag club-site:latest club-site:$(date +%F)
```

Rolling back is `docker compose up -d` against a previously tagged image.

## The one thing you must not get wrong

**`SITE_URL` is a build argument, not a runtime setting.** Canonical URLs, the sitemap, the social
preview image URLs and the structured data are all written into the HTML when the image is built. An
image built with `SITE_URL=http://localhost:8080` and then deployed to the real domain will serve
link previews and a sitemap pointing at localhost — and nothing about the running site will look
wrong until somebody shares a link.

The build fails if `SITE_URL` is unset, and the value is recorded as an image label, so you can ask
a running container what it was built for:

```bash
docker inspect club-site:latest --format '{{ index .Config.Labels "site.url" }}'
```

> 🔴 **Unresolved (D30).** Two domains were proposed: `www.innochipdesign.ru` (recommended
> canonical) and `innochipdesign.campus.innopolis.university` (recommended 301 alias). Pick one
> before the first production build. Serving the same image on both hostnames means every page
> declares a canonical pointing at the other host for half its visitors. If the campus host must
> serve content directly, build the image **twice** with different `SITE_URL` values and run two
> containers — do not serve one build under two names.

## Serving modes

Same image, three modes, switched by env and a restart — no rebuild, provided `SITE_URL` already
matched the final public URL.

| Mode | `.env` | Result |
|---|---|---|
| Behind the university proxy (**current**) | defaults | Listens on `:8080`, plain HTTP |
| Public domain, automatic TLS | `SITE_ADDRESS=club.example.edu`, `AUTO_HTTPS=on` | Caddy obtains and renews Let's Encrypt certificates |
| Local preview | `SITE_ADDRESS=:8080` | `http://localhost:8080` |

**Ask the university's networking team to forward `X-Forwarded-Proto` and `X-Forwarded-For`.**
Without the first, any absolute redirect Caddy generates can downgrade to `http://`; without the
second, the access log records the proxy's IP for every visitor.

## Before you deploy

The full checklist is in [`planning/08-deployment.md`](planning/08-deployment.md) §8. The short
version:

```bash
pnpm check && pnpm test
SITE_URL=<the real domain> pnpm build
docker compose up --build       # smoke-test the real artifact, not `astro preview`
```

Then click through every route in both zones, including a bad path under `/club/` **and** a bad
path at the root, and confirm `dist/sitemap-index.xml`, `dist/robots.txt` and one OG image URL all
carry the production domain.

## If the build fails on `sharp` or `resvg`

Those two ship prebuilt binaries. If either fails to resolve on Alpine, change the first line of
the `Dockerfile` build stage from `node:24-alpine` to `node:24-slim`. It is the most likely
first-build failure and it is a one-line fix.

## After a week: turn on the CSP

The Content-Security-Policy **is** shipped, but as `Content-Security-Policy-Report-Only` (D29). In
report-only mode the browser reports violations instead of blocking them, which converts a possible
outage into a log line.

It is generated at build time by `src/integrations/generate-csp.ts` from the built output itself —
the sha256 of every inline script that actually shipped, and a `frame-src` containing exactly the
video hosts the published pages reference (`'none'` when there are none). You never edit it, and it
cannot drift from the HTML. The build writes it to `csp.caddy` beside `dist/`, and the Dockerfile
copies it to `/etc/caddy/csp.caddy`, outside the web root.

To enforce it, open the browser console on `/`, `/club`, a project page with a video (click play), a
project page with a gallery (open the lightbox), and `/club/contact`. With zero violations on all
five, add to `.env`:

```
CSP_HEADER=Content-Security-Policy
```

and `docker compose up -d`. No rebuild — the header name is read at runtime.

## Verifying a deploy

```bash
curl -sI https://<domain>/club | grep -iE 'content-security|cache-control'
curl -s  https://<domain>/robots.txt
```

Expect `must-revalidate` on pages, `immutable` on `/_astro/*`, and a sitemap URL carrying the real
domain. Two failure modes worth checking explicitly, because both were real bugs during the build
and neither is visible from the page itself:

- **Pages must return 200, not 308.** `trailingSlash: 'never'` means every canonical points at
  `/club` with no slash; the Caddyfile's `try_files` is what stops Caddy redirecting to `/club/`.
- **Pages must carry a `Cache-Control` header.** An earlier Caddyfile matched on the response
  `Content-Type`, which is not a thing Caddy's `header` directive can do, so pages shipped with
  none at all.
