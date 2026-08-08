/**
 * Post-build assertions against `dist/`. Run by `pnpm verify` after a build.
 *
 * These are the smoke tests from 03-search-and-filtering.md §6, plus the checks that only mean
 * anything once there is a real artifact to look at. They exist because the failures they catch are
 * all SILENT — the page still renders, the build still succeeds, and nobody notices for a month:
 *
 *   · a Pagefind filter renamed on one side of the contract
 *   · the explorer island swallowing the server-rendered list, visible only with JS off
 *   · a project whose cover fell through the stub and left a hole in the row list
 *   · a CSP that omits the hash of a script the page actually runs
 *   · an OG or canonical URL still carrying localhost after a production build
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const failures = [];
const notes = [];

const ok = (label) => notes.push(`  ✓ ${label}`);
const fail = (label) => failures.push(`  ✗ ${label}`);
const check = (condition, label) => (condition ? ok(label) : fail(label));

const read = (p) => readFile(path.join(DIST, p), 'utf-8');
const exists = async (p) => !!(await stat(path.join(DIST, p)).catch(() => null));

async function html(pathname) {
  return read(path.join(pathname, 'index.html'));
}

async function pages() {
  const found = [];
  const walk = async (dir) => {
    for (const entry of await readdir(path.join(DIST, dir), { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(path.join(dir, entry.name));
      else if (entry.name === 'index.html') found.push(path.join(dir, entry.name));
    }
  };
  await walk('.');
  return found;
}

// ── 1. Pagefind index exists and is non-empty ───────────────────────────────────────────────
const pagefindJs = await stat(path.join(DIST, 'pagefind/pagefind.js')).catch(() => null);
check(pagefindJs && pagefindJs.size > 0, 'pagefind/pagefind.js exists and is non-empty');

// ── 2. The markup contract on every project page ────────────────────────────────────────────
const projectDirs = (
  await readdir(path.join(DIST, 'club/projects'), { withFileTypes: true }).catch(() => [])
)
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

check(projectDirs.length > 0, `found ${projectDirs.length} project page(s)`);

for (const slug of projectDirs) {
  const page = await html(path.join('club/projects', slug));
  const missing = ['data-pagefind-body', 'tag[data-tags]', 'year[data-year]', 'status[data-status]']
    .filter((token) => !page.includes(token));
  check(missing.length === 0, `${slug}: Pagefind contract intact${missing.length ? ` (missing ${missing.join(', ')})` : ''}`);
}

// ── 3. The index page stays out of the index ────────────────────────────────────────────────
const directory = await html('club/projects');
check(directory.includes('data-pagefind-ignore'), '/club/projects carries data-pagefind-ignore');

// ── 5. Every project is a real link with JS off ─────────────────────────────────────────────
// The one that catches "the island swallowed the server-rendered list".
const rows = [...directory.matchAll(/<li[^>]*\sdata-project\b/g)].length;
check(
  rows === projectDirs.length,
  `directory server-renders all ${projectDirs.length} project(s) (found ${rows} rows)`,
);
for (const slug of projectDirs) {
  check(directory.includes(`href="/club/projects/${slug}"`), `${slug}: linked from the directory`);
}

// ── 6. Every row has a thumbnail ────────────────────────────────────────────────────────────
// Catches a project with no cover falling through the stub instead of into it (D21).
const rowBlocks = directory.split(/<li[^>]*\sdata-project\b/).slice(1);
const thumbless = rowBlocks.filter((block) => !/<img\s|data-stub/.test(block)).length;
check(thumbless === 0, `every directory row has a thumbnail or a stub (${thumbless} without)`);

// ── CSP covers every inline script that actually ships ──────────────────────────────────────
const { createHash } = await import('node:crypto');
const csp = await readFile('csp.caddy', 'utf-8').catch(() => '');
check(csp !== '', 'csp.caddy was generated');

let uncovered = 0;
const allPages = await pages();
for (const page of allPages) {
  const source = await read(page);
  for (const match of source.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    const type = (/\stype\s*=\s*["']?([^"'\s>]*)/i.exec(match[1] ?? '')?.[1] ?? '').toLowerCase();
    if (!['', 'module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    if ((match[2] ?? '').trim() === '') continue;
    const hash = createHash('sha256').update(match[2], 'utf8').digest('base64');
    if (!csp.includes(hash)) uncovered += 1;
  }
}
check(uncovered === 0, `CSP hashes cover every inline script across ${allPages.length} pages (${uncovered} uncovered)`);

// ── The whole point of gating SITE_URL ──────────────────────────────────────────────────────
// A production image built with a localhost URL serves wrong link previews and a wrong sitemap,
// and nothing looks broken until somebody shares a link.
const site = process.env.SITE_URL ?? '';
if (site && !site.includes('localhost')) {
  const home = await html('club');
  check(home.includes(`<link rel="canonical" href="${site}/club"`), 'canonical carries the build domain');
  check(home.includes(`content="${site}/og/`), 'og:image is absolute and on the build domain');
  const sitemap = await read('sitemap-0.xml').catch(() => '');
  check(sitemap.includes(site), 'sitemap carries the build domain');
  const robots = await read('robots.txt');
  check(robots.includes(`${site}/sitemap-index.xml`), 'robots.txt carries the absolute sitemap URL');
  check(robots.includes('Disallow: /originals/'), 'robots.txt keeps full-resolution originals out of the crawl');
} else {
  notes.push('  — domain assertions skipped (SITE_URL is localhost or unset)');
}

// ── Generated artefacts that pages reference ────────────────────────────────────────────────
for (const asset of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'og/default.png', 'og/portal.png']) {
  check(await exists(asset), `${asset} exists`);
}
for (const slug of projectDirs) {
  check(await exists(`og/${slug}.png`), `og/${slug}.png generated`);
}

// ── Report ──────────────────────────────────────────────────────────────────────────────────
console.log(notes.join('\n'));
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`\nAll ${notes.filter((n) => n.startsWith('  ✓')).length} dist checks passed.`);
