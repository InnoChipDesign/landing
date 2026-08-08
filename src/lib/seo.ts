import type { CollectionEntry } from 'astro:content';

import { site } from '../data/site';
import { routes, absolute } from './routes';
import { parseVideoUrl } from './video';

/**
 * JSON-LD builders (07-seo.md §3). Emitted by `<Seo>` as `application/ld+json`.
 *
 * Everything here takes an absolute `origin` rather than reading `import.meta.env.SITE`, because
 * structured data with a relative URL is silently worthless — validators accept it and consumers
 * discard it — and passing the origin in makes that impossible to forget.
 */

export type Json = Record<string, unknown>;

const drop = <T extends Json>(object: T): T =>
  Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null),
  ) as T;

/** On every page in both zones, so the club is one entity no matter where a crawler enters. */
export function organization(origin: string): Json {
  return {
    '@type': 'Organization',
    '@id': `${absolute(routes.club(), origin)}#organization`,
    name: site.fullName,
    alternateName: site.name,
    url: absolute(routes.club(), origin),
    logo: absolute('/icon-512.png', origin),
    description: site.pitch,
    foundingDate: String(site.foundedYear),
    email: site.contact.email,
    sameAs: site.social.map((entry) => entry.url),
    parentOrganization: { '@type': 'CollegeOrUniversity', name: site.university.name, url: site.university.url },
  };
}

/** `/` only. The portal is the homepage as far as a crawler is concerned (07 §1). */
export function website(origin: string): Json {
  return {
    '@type': 'WebSite',
    '@id': `${absolute('/', origin)}#website`,
    name: site.name,
    url: absolute('/', origin),
    publisher: { '@id': `${absolute(routes.club(), origin)}#organization` },
  };
}

/**
 * `SoftwareSourceCode` when the project has a repository, `CreativeWork` otherwise.
 *
 * For a hardware club that is the more accurate type for most projects, and it is what makes a
 * project page legible to a recruiter's tooling: `codeRepository` and `programmingLanguage` are
 * fields those tools actually read.
 */
export function project(
  entry: CollectionEntry<'projects'>,
  origin: string,
  tagLabels: Map<string, string>,
  /** id → display name, so a credit given as a `person` reference is not dropped from `author`. */
  peopleNames: Map<string, string> = new Map(),
): Json {
  const { data } = entry;
  const url = absolute(routes.project(entry.id), origin);
  const isCode = !!data.links.repo;

  // Only the HDLs — `stack` also carries tools (Vivado, cocotb), and claiming Quartus Prime is a
  // programming language is the kind of small lie that makes the whole block untrustworthy.
  const languages = data.stack.filter((item) =>
    /^(system)?verilog$|^vhdl$|^chisel$|^python$|^c\+\+$|^c$|^rust$/i.test(item),
  );

  return drop({
    '@type': isCode ? 'SoftwareSourceCode' : 'CreativeWork',
    '@id': `${url}#project`,
    name: data.title,
    headline: data.title,
    description: data.summary,
    url,
    image: absolute(routes.og(entry.id), origin),
    dateCreated: String(data.year),
    datePublished: String(data.year),
    dateModified: data.updated ? data.updated.toISOString().slice(0, 10) : undefined,
    keywords: data.tags.map((tag) => tagLabels.get(tag) ?? tag).join(', '),
    // A credit may be a `person` reference OR a bare name (D8 — the minimum-consent path), and
    // both belong in `author`. Anything with neither is skipped rather than emitted nameless.
    author: authors(data.team, peopleNames),
    isPartOf: { '@id': `${absolute(routes.club(), origin)}#organization` },
    codeRepository: isCode ? data.links.repo : undefined,
    programmingLanguage: isCode && languages.length > 0 ? languages : undefined,
    award: data.awards.length > 0 ? data.awards.map((a) => a.title) : undefined,
  });
}

function authors(
  team: CollectionEntry<'projects'>['data']['team'],
  peopleNames: Map<string, string>,
): Json[] | undefined {
  const named = team
    .map((credit) => (credit.person ? peopleNames.get(credit.person.id) : undefined) ?? credit.name)
    .filter((name): name is string => !!name)
    .map((name) => ({ '@type': 'Person', name }));
  return named.length > 0 ? named : undefined;
}

/**
 * `VideoObject` is what makes Google show a video thumbnail beside the result — worth the few lines
 * for a club whose whole point is demos.
 *
 * `embedUrl` is emitted even though the page uses a click-to-load facade (D10). The markup
 * describes the video; it does not describe the loading strategy, and omitting it forfeits the rich
 * result for no privacy gain — nothing is fetched until a visitor clicks either way.
 */
export function video(entry: CollectionEntry<'projects'>, origin: string): Json | undefined {
  const { data } = entry;
  if (!data.video) return undefined;
  const embed = parseVideoUrl(data.video);

  return drop({
    '@type': 'VideoObject',
    name: data.videoTitle ?? `${data.title} — demo`,
    description: data.summary,
    thumbnailUrl: absolute(routes.og(entry.id), origin),
    embedUrl: embed.embedUrl,
    contentUrl: embed.watchUrl,
    // `uploadDate` is required for rich-result eligibility. The project year is the best available
    // approximation; the authoring guide asks for a real `updated` date, which wins when present.
    uploadDate: (data.updated ?? new Date(Date.UTC(data.year, 0, 1))).toISOString().slice(0, 10),
  });
}

export function events(entries: CollectionEntry<'events'>[], origin: string): Json[] {
  return entries.map((entry) =>
    drop({
      '@type': 'Event',
      name: entry.data.title,
      startDate: entry.data.date.toISOString().slice(0, 10),
      endDate: entry.data.endDate?.toISOString().slice(0, 10),
      location: entry.data.location
        ? { '@type': 'Place', name: entry.data.location }
        : undefined,
      organizer: { '@id': `${absolute(routes.club(), origin)}#organization` },
      url: entry.data.link ?? absolute(routes.events(), origin),
    }),
  );
}

export function contactPage(origin: string): Json {
  const { address } = site.contact;
  return {
    '@type': 'ContactPage',
    url: absolute(routes.contact(), origin),
    mainEntity: {
      '@id': `${absolute(routes.club(), origin)}#organization`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: address.street,
        addressLocality: address.locality,
        addressRegion: address.region,
        postalCode: address.postalCode,
        addressCountry: address.country,
      },
    },
  };
}

/**
 * Breadcrumbs always include the `/club` hop, so a trail reads
 * "InnoChipDesign › Projects › SchoolRV32I" rather than starting at the portal — the portal is a
 * different zone, and a crawler that treats it as this page's parent gets the hierarchy wrong.
 */
export function breadcrumbs(trail: { name: string; href: string }[], origin: string): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: absolute(step.href, origin),
    })),
  };
}

/** Wraps whatever a page built into one `@graph`, which is how several types share one script tag. */
export function graph(nodes: (Json | undefined)[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': nodes.filter((node): node is Json => node !== undefined),
  });
}
