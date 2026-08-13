import { getPermalink } from '~/utils/permalinks';
import { site } from '~/data/site';

/**
 * Chrome for the CLUB zone only. The portal at `/` has no nav by design — it is a switchboard, and
 * PortalLayout gives it no header or footer at all.
 *
 * No `actions`: the club's other properties are reached through the portal link beside the
 * wordmark and the portal itself, not through buttons on every club page. The header's only job
 * here is to move a reader around the club site.
 */
export const clubHeaderData = {
  links: [
    { text: 'About', href: getPermalink('/club/about') },
    { text: 'Join', href: getPermalink('/club/join') },
    { text: 'Contact', href: getPermalink('/club/contact') },
  ],
};

export const clubFooterData = {
  links: [
    {
      title: 'Club',
      links: [
        { text: 'About', href: getPermalink('/club/about') },
        { text: 'Join', href: getPermalink('/club/join') },
        { text: 'Contact', href: getPermalink('/club/contact') },
      ],
    },
    {
      title: 'Elsewhere',
      links: [
        { text: 'GitHub', href: site.repoUrl },
        { text: 'Telegram', href: site.contact.chat },
        { text: site.university.name, href: site.university.url },
      ],
    },
  ],
  // No Terms or Privacy — those pages do not exist, and linking them would 404. The one secondary
  // link that earns its place is the way back out to the portal.
  secondaryLinks: [{ text: 'All InnoChipDesign properties', href: '/' }],
  socialLinks: [
    { ariaLabel: 'Telegram', icon: 'tabler:brand-telegram', href: site.contact.chat },
    { ariaLabel: 'GitHub', icon: 'tabler:brand-github', href: site.repoUrl },
  ],
  footNote: `
    © ${site.foundedYear}–${new Date().getFullYear()} ${site.fullName} · A student club at
    <a class="text-primary hover:underline" href="${site.university.url}">${site.university.name}</a>
  `,
};
