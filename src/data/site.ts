/**
 * Club facts. Copied by hand from CLUB.md, which is the source of truth.
 *
 * Rule: no component, layout or page may hardcode a club fact that is not in this file or in a
 * content file. If you find yourself typing an address, a Telegram handle or a founding year into
 * a `.astro` file, it belongs here instead.
 *
 * 🔴 markers below are facts the club leader still owes us; they are tracked in CLUB.md.
 */
export const site = {
  name: 'InnoChipDesign',
  fullName: 'Innopolis Chip Design Club',
  // The wordmark inside the club zone. `name` is the umbrella brand over every property and stays
  // on the portal; under /club the header says what this particular property is.
  clubName: 'ICD Student Club',
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
    // Deliberately a recurring statement, not a date. Nobody volunteered to keep a "next
    // meeting" banner current, and a stale date makes a site look abandoned; this sentence stays
    // true for years unmaintained.
    recurrence: 'Every Saturday at 12:00',
    season: 'during the spring and fall semesters',
    locationNote: 'The room is announced in the Telegram chat before each session.',
  },

  join: {
    // This is YADRO's Chip Design School application, NOT a club membership form. The
    // /club/join copy must say so plainly; `formIsThirdParty` drives that note. A visitor who
    // wanted to join the club and lands on an unrelated school signup is the failure to avoid.
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

  // Partners are omitted from the website until ADV-T wording and relationship are confirmed
  // (see CLUB.md §6).

  competition: {
    name: 'YADRO SoC Design Challenge',
    url: 'https://edu.yadro.com/soc-design-challenge/',
    // 🔴 The 2024 track, placement and team are unverified. Until they are supplied, this is the
    // truthful, checkable version — do not upgrade it to "won prizes".
    record:
      'The club has fielded teams at the YADRO SoC Design Challenge every year from 2023 to 2026 ' +
      'and placed in 2024.',
  },

  faq: [
    {
      question: 'Do I need prior hardware or Verilog experience?',
      answer:
        'No. There is no selection process and no prior experience required — several current members started by turning up.',
    },
    {
      question: 'Do I have to apply through the YADRO Chip Design School?',
      answer:
        'No application is required to come to Saturday sessions. The Chip Design School is a free third-party course run by YADRO with MIET, MFTI and ITMO whose curriculum our sessions follow; signing up for it is optional.',
    },
    {
      question: 'When and where do you meet?',
      answer:
        'Every Saturday at 12:00 during the spring and fall semesters at Innopolis University (Universitetskaya Street 1). The room is never fixed and is announced in the Telegram chat before each session.',
    },
    {
      question: 'What will I actually build?',
      answer:
        'Digital hardware: writing RTL, running designs on real FPGA boards, verifying them, and building your own projects — from RISC-V cores and memory subsystems to games — published on GitHub.',
    },
    {
      question: 'Is there any membership fee?',
      answer: 'No. The club is a student engineering community at Innopolis University and is free to join.',
    },
  ],
} as const;

export type Site = typeof site;
