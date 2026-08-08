/**
 * Club facts. Copied by hand from planning/11-club-data.md §10, which is the source of truth.
 *
 * Rule: no component, layout or page may hardcode a club fact that is not in this file or in a
 * content file. If you find yourself typing an address, a Telegram handle or a founding year into
 * a `.astro` file, it belongs here instead.
 *
 * 🔴 markers below are facts the club leader still owes us (11-club-data.md §11).
 */
export const site = {
  name: 'InnoChipDesign',
  fullName: 'Innopolis Chip Design Club',
  foundedYear: 2023,

  tagline: 'Innopolis community dedicated to FPGA, ASIC and RISC-V.',
  pitch:
    'Innopolis Chip Design Club is a student, scientific and engineering community at ' +
    'Innopolis University that aims to learn and practice the art of hardware design.',

  university: {
    name: 'Innopolis University',
    url: 'https://innopolis.university',
  },

  // The canonical origin comes from `import.meta.env.SITE` (astro.config `site`), which is set from
  // the SITE_URL build arg. Never hardcode the origin here.
  clubBase: '/club',

  repoUrl: 'https://github.com/InnoChipDesign',

  contact: {
    email: 'm.kuskov@innopolis.university',
    chat: 'https://t.me/InnoChipDesign',
    github: 'https://github.com/InnoChipDesign',
    address: {
      street: 'Universitetskaya Street 1',
      locality: 'Innopolis',
      region: 'Republic of Tatarstan',
      postalCode: '420500',
      country: 'RU',
    },
    // D27 — the contact map is a clickable static image, not a live embed. Keeps the site's
    // "zero third-party requests except a clicked video" property and needs no CSP widening.
    mapLink: 'https://yandex.ru/maps/?text=Университетская+1,+Иннополис',
  },

  advisor: { name: 'Mikhail Kuskov', role: 'Senior Instructor' },

  meetings: {
    // D26 — deliberately a recurring statement, not a date. Nobody volunteered to keep a "next
    // meeting" banner current, and a stale date makes a site look abandoned.
    recurrence: 'Every Saturday at 12:00',
    season: 'during the spring and fall semesters',
    locationNote: 'The room is announced in the Telegram chat before each session.',
  },

  join: {
    // D18 — this is YADRO's Chip Design School application, NOT a club membership form. The
    // /club/join copy must say so plainly; `formIsThirdParty` drives that note.
    formUrl: 'https://engineer.yadro.com/chip-design-school/#applicationForm',
    formLabel: 'Sign up for the Chip Design School',
    formIsThirdParty: true,
    chatUrl: 'https://t.me/InnoChipDesign',
    openToAll: true,
  },

  social: [
    { id: 'telegram', label: 'Telegram', url: 'https://t.me/InnoChipDesign' },
    { id: 'github', label: 'GitHub', url: 'https://github.com/InnoChipDesign' },
  ],

  // D32 — partners row at the foot of /club/about.
  partners: [
    {
      name: 'ADV-T', // 🔴 confirm: brand name, or ООО «Адв-Тех»?
      legalName: 'ООО «Адв-Тех»',
      url: 'https://adv-t.ru',
      note: 'Systems integrator', // 🔴 confirm the relationship wording
    },
  ],
  // Rendered only when partners.length > 0 — alone it reads as "nobody sponsors us".
  partnerInvite: {
    enabled: true,
    heading: 'Your company could be here',
    body: 'We work with companies on student hardware projects.',
    mailto: 'm.kuskov@innopolis.university',
  },

  competition: {
    name: 'YADRO SoC Design Challenge',
    url: 'https://edu.yadro.com/soc-design-challenge/',
    // 🔴 The 2024 track, placement and team are unverified (11-club-data.md §6). Until they are
    // supplied, this is the truthful, checkable version — do not upgrade it to "won".
    record:
      'The club has fielded teams at the YADRO SoC Design Challenge every year since 2023 and ' +
      'placed in 2024.',
  },
} as const;

export type Site = typeof site;
