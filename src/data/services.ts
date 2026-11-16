/**
 * The club's web properties. They surface in exactly one place: the portal grid at `/`, from
 * entries with `onPortal: true`. The club header used to carry two of them as buttons and no
 * longer does — under `/club` the only route to the other properties is the portal link beside the
 * wordmark, which keeps the club header about the club.
 *
 * `kind: 'external'` drives target="_blank" rel="noopener noreferrer" and the ↗ glyph everywhere a
 * service is rendered, in one place rather than three.
 */
export type Service = {
  id: string;
  name: string;
  short?: string;
  tagline: string;
  url: string;
  kind: 'internal' | 'external';
  icon: string;
  onPortal: boolean;
};

export const services: readonly Service[] = [
  {
    id: 'club',
    name: 'The Student Club',
    tagline: 'Projects, events and how to join.',
    url: '/club',
    kind: 'internal',
    icon: 'tabler:cpu',
    onPortal: true,
  },
  {
    id: 'vcd',
    name: 'Visual Circuit Designer',
    short: 'VCD',
    tagline: 'Design, simulate and compile circuits, interactively.',
    url: 'https://innochipdesign.campus.innopolis.university/vcd',
    kind: 'internal',
    icon: 'tabler:circuit-changeover',
    onPortal: true,
  },
  {
    id: 'hw',
    name: 'Homework',
    short: 'HW',
    tagline: 'Verilog practice with submission and automatic grading.',
    url: 'https://innochipdesign.campus.innopolis.university/homework',
    kind: 'internal',
    icon: 'tabler:checkbox',
    onPortal: true,
  },
];

export const portalServices = services.filter((s) => s.onPortal);
