/**
 * The only place a URL is constructed (01-architecture.md §2).
 *
 * There is no Astro `base` config: this build owns BOTH zones — the portal at `/` and the club at
 * `/club` — so the prefix is a real directory under `src/pages/club/`, not a config value. Every
 * internal link is root-absolute and goes through this module. Never string-concatenate `'/club/'`
 * in a component: one typo'd prefix is invisible until somebody clicks it.
 *
 * If the club is ever moved to the domain root, or under a different prefix, this file is the
 * only edit.
 */
export const routes = {
  portal: () => '/',
  club: () => '/club',
  projects: () => '/club/projects',
  project: (slug: string) => `/club/projects/${slug}`,
  about: () => '/club/about',
  events: () => '/club/events',
  equipment: () => '/club/equipment',
  resources: () => '/club/resources',
  join: () => '/club/join',
  contact: () => '/club/contact',
  og: (slug: string) => `/og/${slug}.png`,
  original: (slug: string, file: string) => `/originals/${slug}/${file}`,
} as const;

/** Club-zone nav, in header order. `Contact` is deliberately footer-only (05 §3). */
export const clubNav = [
  { label: 'Projects', href: routes.projects() },
  { label: 'About', href: routes.about() },
  { label: 'Events', href: routes.events() },
  { label: 'Equipment', href: routes.equipment() },
  { label: 'Resources', href: routes.resources() },
  { label: 'Join', href: routes.join() },
] as const;

/** Footer "Site" column — the header six, plus Contact. */
export const footerNav = [...clubNav, { label: 'Contact', href: routes.contact() }] as const;

/** True when `href` is the current page, or an ancestor of it (`/club/projects/x` → Projects). */
export function isActive(href: string, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (href === '/') return path === '/';
  if (href === routes.club()) return path === routes.club();
  return path === href || path.startsWith(`${href}/`);
}

/** Absolute URL against the build-time origin. Used for canonicals, OG tags and JSON-LD. */
export function absolute(path: string, site: URL | string | undefined): string {
  if (!site) throw new Error('absolute(): `site` is unset — check SITE_URL (08-deployment.md §2)');
  return new URL(path, site).href;
}
