# Build & Deployment

Implements D14: multi-stage Docker build, Caddy serving static files, sitting **behind the
university's existing reverse proxy**, with TLS switchable on without a rebuild.

## 1. Topology

```
                    ┌──────────────────────────────────────────┐
  Internet ───────► │ University reverse proxy (terminates TLS) │
                    └────────────────────┬─────────────────────┘
                                         │ http
                    ┌────────────────────▼─────────────────────┐
                    │  club-site container                     │
                    │  caddy:2-alpine  ·  listens :8080        │
                    │  /srv  ← dist/ baked into the image      │
                    └──────────────────────────────────────────┘
```

The container is stateless and read-only. There is no database, no volume, no writable path, and
nothing to back up other than the git repository itself.

## 2. `SITE_URL` is a build argument, not a runtime variable

This is the one deployment detail that must not be got wrong. Canonical URLs, the sitemap, OG image
URLs and JSON-LD are all baked into the HTML **at build time**. A container built with
`SITE_URL=http://localhost:8080` and then deployed to the real domain will serve link previews and a
sitemap pointing at localhost.

Therefore `SITE_URL` is a `--build-arg`, the build fails if it is unset, and the value is recorded in
an image label so a running container can be interrogated about what it was built for.

### 🔴 D30 — which domain, unresolved

Two were supplied:

| Candidate | |
|---|---|
| `https://www.innochipdesign.ru` | proposed canonical — public, memorable, matches the brand |
| `https://innochipdesign.campus.innopolis.university` | proposed alias |

**Pick one before the first production build.** Serving the same image on both hostnames means every
page declares a canonical URL pointing at the *other* host for half its visitors, splits any search
ranking, and makes shared links inconsistent.

Recommended: build with `SITE_URL=https://www.innochipdesign.ru`, and have the university's proxy
issue a permanent redirect from the campus host:

```
innochipdesign.campus.innopolis.university/*  →  301  →  www.innochipdesign.ru/*
```

If the campus host must serve content directly (e.g. it is reachable inside the university network
when the public domain is not), build the image **twice** with different `SITE_URL` values and run
two containers, rather than serving one build under two names.

Note the site's URL layout: the portal is at `/` and the club at `/club` (D15/D19). `SITE_URL` is the
**origin only** — no path suffix. `https://www.innochipdesign.ru/club` as a `SITE_URL` would produce
`/club/club/projects` everywhere.

## 3. `Dockerfile`

```dockerfile
# ── stage 1: build ────────────────────────────────────────────
FROM node:24-alpine AS build
ARG SITE_URL
RUN test -n "$SITE_URL" || (echo "SITE_URL build-arg is required" && exit 1)
ENV SITE_URL=$SITE_URL

WORKDIR /app
RUN corepack enable

# dependency layer — cached unless the lockfile changes
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build          # astro check && astro build && pagefind --site dist

# ── stage 2: serve ────────────────────────────────────────────
FROM caddy:2-alpine
LABEL org.opencontainers.image.source="https://<repo>" \
      site.url="${SITE_URL}"
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
```

Notes:
- `sharp` and `@resvg/resvg-js` ship prebuilt binaries for `linux-musl-x64`; if either fails to
  resolve on Alpine, switch stage 1 to `node:24-slim` (Debian). Flagged because it is the most likely
  first-build failure, and the fix is one line.
- Final image is Caddy + static files, roughly **50 MB**. No Node, no `node_modules`, no source, and
  therefore no npm CVE surface in what actually runs.
- `.dockerignore` must exclude `node_modules`, `dist`, `.git`, `planning/`, and `public/pagefind`
  (the dev-only search snapshot), or the build context balloons and the dev snapshot can shadow the
  real one.

## 4. `Caddyfile` — switchable

```caddyfile
{
	admin off
	auto_https {$AUTO_HTTPS:off}
}

{$SITE_ADDRESS::8080} {
	root * /srv
	file_server
	encode zstd gzip

	# hashed build assets — immutable
	@immutable path /_astro/* /pagefind/* /fonts/*
	header @immutable Cache-Control "public, max-age=31536000, immutable"

	# HTML — always revalidate, so a redeploy is visible immediately.
	# `build.format: 'directory'` means most pages are served as `<dir>/index.html`
	# with no extension in the URL, so matching `*.html` alone would miss almost
	# every page. Match on the response type instead.
	@html header Content-Type text/html*
	header @html Cache-Control "public, max-age=0, must-revalidate"

	# full-resolution originals — long cache, they never change
	@originals path /originals/*
	header @originals Cache-Control "public, max-age=604800"

	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options SAMEORIGIN
		Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()"
		-Server
	}

	handle_errors {
		@404 expression {err.status_code} == 404
		rewrite @404 /404.html
		file_server
	}

	log {
		output stdout
		format json
	}
}
```

Three modes, same image:

| Mode | Env | Result |
|---|---|---|
| Behind the university proxy (**current**) | *(defaults)* | Listens `:8080`, plain HTTP |
| Public domain, auto-TLS | `SITE_ADDRESS=club.example.edu` `AUTO_HTTPS=on` | Caddy obtains and renews Let's Encrypt certs |
| Local preview | `SITE_ADDRESS=:8080` | `http://localhost:8080` |

Switching modes is an env change and a container restart — no rebuild, provided `SITE_URL` at build
time already matched the final public URL.

**Caveat when behind the university proxy:** ask their team to forward `X-Forwarded-Proto` and
`X-Forwarded-For`. Without the first, any absolute-URL redirect Caddy generates can downgrade to
`http://`; without the second, the access log records the proxy's IP for every visitor. Neither
breaks a purely static site, but both are worth getting right once.

## 5. `docker-compose.yml`

```yaml
services:
  web:
    build:
      context: .
      args:
        SITE_URL: ${SITE_URL:?SITE_URL must be set in .env}
    image: club-site:latest
    restart: unless-stopped
    ports:
      - "${HOST_PORT:-8080}:8080"
    environment:
      SITE_ADDRESS: ${SITE_ADDRESS::8080}
      AUTO_HTTPS: ${AUTO_HTTPS:-off}
    read_only: true
    tmpfs:
      - /tmp
      - /config
      - /data
    security_opt: [no-new-privileges:true]
    cap_drop: [ALL]
    cap_add: [NET_BIND_SERVICE]
```

`.env.example` is committed; `.env` is git-ignored.

Deploy is one command:

```bash
docker compose up -d --build
```

Rollback is `docker compose up -d` against a previously tagged image — so tag every deploy
(`club-site:2026-08-07`) rather than relying on `latest` alone.

## 6. Content Security Policy

The CSP is generated, not hand-written, because it depends on two moving parts: Astro's inline
scripts (theme toggle, mobile menu, video facade, island hydration) and which video hosts the
published content actually references.

- Prefer **Astro's built-in CSP support**, which computes hashes for the inline scripts and styles it
  emits and injects the policy into each page. Verify the exact config shape against the Astro 7 docs
  at implementation time.
- `frame-src` is generated at build from the set of providers referenced by non-draft projects
  (`04-media.md` §B3). It lists only the hosts in use, never `*`. If no project has a video, it is
  `'none'`.

Target policy (`frame-src` shown with all four providers present; the real one will usually be shorter):

```
default-src 'self';
img-src 'self' data:;
font-src 'self';
style-src 'self' <hashes>;
script-src 'self' <hashes>;
frame-src https://www.youtube-nocookie.com https://rutube.ru https://vk.com https://dzen.ru;
connect-src 'self';
base-uri 'self';
form-action 'none';
frame-ancestors 'self';
object-src 'none'
```

Two notes specific to this site:

- `img-src` needs `data:` for the generated cover stubs, which are inline SVG/data URIs (D21). It
  does **not** need any third-party host: video posters are committed images, never fetched from the
  provider's thumbnail API (`04-media.md` §B2).
- `connect-src 'self'` is enough because Pagefind fetches its index chunks from the same origin.
- There is no `frame-src` entry for a map — the contact map is a static image (D27). Adding a live
  Yandex Maps embed would require widening both `frame-src` and `script-src`.

### Report-only first (D29)

Ship the header as `Content-Security-Policy-Report-Only` for the first week after launch, read the
violations, then rename it to `Content-Security-Policy`.

In report-only mode the browser *reports* violations instead of blocking them. Enforced on day one,
a single missed hash silently breaks the theme toggle or blanks every video, with a console error
most visitors never report. One week of reports converts a possible outage into a log line.

Concretely, before flipping: open the browser console on `/`, `/club`, a project page **with** a
video (click play), a project page with a gallery (open the lightbox), and `/club/contact`. Zero
violations on all five, then flip.

## 7. Local development

```bash
pnpm install
pnpm dev              # http://localhost:4321 — portal at /, club at /club, no search index
pnpm search:dev       # build once, copy pagefind into public/ for real search in dev
SITE_URL=http://localhost:4321 pnpm build && pnpm preview
docker compose up --build    # verify the real artifact before deploying
```

`SITE_URL` has no default (`01-architecture.md` §6), so a local build must supply one. That is
deliberate: an accidental default is exactly how a production image ends up with localhost canonicals.

The last line matters: `astro preview` and Caddy differ in caching, error pages and header
behaviour. Anything shipping to the club's server should be smoke-tested through the container.

## 8. Release checklist

1. `pnpm check` clean; `pnpm test` clean (video parsers, url-state round-trip, routes).
2. `pnpm build` succeeds — Zod validation, tag vocabulary, header-service cap and video-URL parsing
   all pass.
3. Search smoke tests pass (`03-search-and-filtering.md` §6), **including test 5** — every non-draft
   project reachable with JS disabled.
4. Lighthouse on `/`, `/club`, `/club/projects`, `/club/projects/<slug>` meets `07-seo.md` §5.
5. Spot-check three project pages with JS disabled: rows link, gallery links open originals, the
   video facade links out to the provider's page.
6. Verify `dist/sitemap-index.xml`, `dist/robots.txt` and one OG image URL all carry the **production**
   domain — and the one chosen in D30, not the other candidate.
7. Confirm the portal at `/` renders all `onPortal` services and that both header buttons resolve.
8. `docker compose up --build`, click through every route in both zones, including `/404` reached
   from a bad path under `/club/` **and** from a bad path at the root.
9. Tag the image with the date, deploy, verify the live URL, keep the previous tag for rollback.
10. After one clean week: flip CSP from report-only to enforced (D29, §6).

## 9. Deliberately absent

No GitHub Actions, no CI service, no container registry, no hosting-provider SDK, no CDN. The
complete deploy path is: `git pull` on the club's server, then `docker compose up -d --build`. That
was the requirement, and it is worth preserving — it means the site outlives any particular platform
account, and the next club leader needs to learn exactly one command.
