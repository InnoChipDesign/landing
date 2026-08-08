# ── stage 1: build ────────────────────────────────────────────
FROM node:24-alpine AS build
ARG SITE_URL
RUN test -n "$SITE_URL" || (echo "SITE_URL build-arg is required — see planning/08-deployment.md §2" && exit 1)
ENV SITE_URL=$SITE_URL

WORKDIR /app
RUN corepack enable

# Dependency layer — cached unless the lockfile changes.
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

COPY . .
# astro check && astro build && pagefind --site dist
RUN pnpm build

# If `sharp` or `@resvg/resvg-js` fails to resolve its prebuilt binary here, switch this stage to
# `node:24-slim` (Debian). Both ship linux-musl-x64 builds, but this is the most likely first-build
# failure and the fix is this one line.

# ── stage 2: serve ────────────────────────────────────────────
# The final image is Caddy plus static files — no Node, no node_modules, no source, and therefore
# no npm CVE surface in what actually runs. Roughly 50 MB.
FROM caddy:2-alpine
ARG SITE_URL
LABEL org.opencontainers.image.source="https://github.com/InnoChipDesign" \
      site.url="${SITE_URL}"
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
