import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Project queries. `draft: true` entries are filtered out HERE, in the one place every caller goes
 * through, and excluded from `getStaticPaths` — so a draft never gets a URL and never enters the
 * search index (02 §2). That is a different axis from `status: idea` (D23).
 */

export type Project = CollectionEntry<'projects'>;

/** Newest first: year desc, then `order` desc as the manual tie-break, then title. */
export async function publishedProjects(): Promise<Project[]> {
  const projects = await getCollection('projects', ({ data }) => !data.draft);
  return projects.sort(byRecency);
}

export function byRecency(a: Project, b: Project): number {
  if (a.data.year !== b.data.year) return b.data.year - a.data.year;
  if (a.data.order !== b.data.order) return b.data.order - a.data.order;
  return a.data.title.localeCompare(b.data.title);
}

/**
 * The homepage strip (05 §4). Falls back to the three newest when fewer than three are flagged —
 * the homepage never renders an empty section.
 */
export async function featuredProjects(limit = 3): Promise<Project[]> {
  const projects = await publishedProjects();
  const featured = projects.filter((p) => p.data.featured);
  return (featured.length >= limit ? featured : projects).slice(0, limit);
}

/** id → label + colour, for the chips. One lookup built once per page rather than per row. */
export async function tagLabels(): Promise<Map<string, { label: string; color: string }>> {
  const tags = await getCollection('tags');
  return new Map(tags.map((t) => [t.id, { label: t.data.label, color: t.data.color }]));
}

/**
 * Related projects by tag overlap, computed at build time (05 §6).
 *
 * With ~20 projects over an 11-tag vocabulary the overlap is usually large, so ties break toward a
 * DIFFERENT year — otherwise "related" reliably returns three games from the same semester.
 */
export function relatedProjects(project: Project, all: Project[], limit = 3): Project[] {
  const tags = new Set(project.data.tags);
  return all
    .filter((candidate) => candidate.id !== project.id)
    .map((candidate) => ({
      candidate,
      overlap: candidate.data.tags.filter((t) => tags.has(t)).length,
      differentYear: candidate.data.year !== project.data.year ? 1 : 0,
    }))
    .filter((entry) => entry.overlap > 0)
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        b.differentYear - a.differentYear ||
        byRecency(a.candidate, b.candidate),
    )
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

/** Derived stats for the /club band. Never typed by hand — a stale number costs trust (05 §4). */
export async function clubStats(foundedYear: number) {
  const projects = await publishedProjects();
  return {
    projectCount: projects.length,
    years: new Date().getFullYear() - foundedYear,
    tagCount: new Set(projects.flatMap((p) => p.data.tags)).size,
  };
}
