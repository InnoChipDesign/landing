import { getCollection } from 'astro:content';
import { clubNav, footerNav, routes } from './routes';

/**
 * D31 / 05 §8 — `/club/equipment` and its nav item are not generated at all while equipment.yaml
 * is empty. An empty Equipment page is worse than no Equipment page, and a nav item pointing at
 * one is worse still.
 */
let equipmentPresent: Promise<boolean> | undefined;
export function hasEquipment(): Promise<boolean> {
  // Memoized: the header, the footer and /club/resources all ask, on every one of eleven routes.
  // It also keeps Astro's "collection is empty" notice to one line per build rather than thirty
  // while equipment.yaml is still waiting for its real contents.
  equipmentPresent ??= getCollection('equipment').then((items) => items.length > 0);
  return equipmentPresent;
}

export async function headerNav(): Promise<{ label: string; href: string }[]> {
  const equipment = await hasEquipment();
  return clubNav.filter((item) => equipment || item.href !== routes.equipment()).map((i) => ({ ...i }));
}

export async function footerLinks(): Promise<{ label: string; href: string }[]> {
  const equipment = await hasEquipment();
  return footerNav.filter((item) => equipment || item.href !== routes.equipment()).map((i) => ({ ...i }));
}

/** The two external service buttons in the header (D16). Capped at 2 by src/lib/validate.ts. */
export async function headerServices() {
  const services = await getCollection('services');
  return services.filter((s) => s.data.inHeader && s.data.status !== 'retired');
}

/** The portal grid at `/` (D19) — the same file, a different view. */
export async function portalServices() {
  const services = await getCollection('services');
  return services.filter((s) => s.data.onPortal && s.data.status !== 'retired');
}
