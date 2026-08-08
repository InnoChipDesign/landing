import { getCollection } from 'astro:content';
import { parseVideoUrl, UnknownVideoProviderError } from './video';

/**
 * Build-time content assertions (02-content-model.md §2).
 *
 * Zod already guarantees the *shape* of each entry. These are the cross-file rules it cannot see:
 * a tag that exists, a video host we can embed, a header that still fits.
 *
 * Every message names the offending file. A malformed project should fail the build, not ship a
 * broken page — and the person who has to fix it is usually a student who has written frontmatter
 * once, so "unknown tag" without a path is not good enough.
 */

/**
 * Runs the assertions once per build (or once per dev-server module graph) and re-throws the same
 * failure to every later caller.
 *
 * `astro:content` is not importable from an integration hook, so validation is triggered from
 * `BaseLayout` — the one module every route in both zones passes through. First page rendered pays
 * for it; the rest get the cached promise.
 */
let pending: Promise<void> | undefined;
export function ensureContentValid(): Promise<void> {
  pending ??= validateContent();
  return pending;
}

export class ContentError extends Error {
  constructor(public readonly problems: string[]) {
    super(`\n\nContent validation failed:\n\n${problems.map((p) => `  · ${p}`).join('\n')}\n`);
    this.name = 'ContentError';
  }
}

export async function validateContent(): Promise<void> {
  const problems: string[] = [];
  const warnings: string[] = [];

  const [projects, tags, services, people] = await Promise.all([
    getCollection('projects'),
    getCollection('tags'),
    getCollection('services'),
    getCollection('people'),
  ]);

  const knownTags = new Set(tags.map((t) => t.id));
  const knownPeople = new Set(people.map((p) => p.id));

  for (const project of projects) {
    const path = `projects/${project.id}/index.mdx`;

    // 1. Every tag exists in tags.yaml.
    for (const tag of project.data.tags) {
      if (!knownTags.has(tag)) {
        const suggestion = nearest(tag, [...knownTags]);
        problems.push(
          `${path}: unknown tag ${JSON.stringify(tag)}` +
            (suggestion ? ` (did you mean ${JSON.stringify(suggestion)}?)` : '') +
            ` — the vocabulary is src/data/tags.yaml`,
        );
      }
    }

    // 2. Every video URL parses to a provider we can embed.
    if (project.data.video) {
      try {
        parseVideoUrl(project.data.video);
      } catch (error) {
        const detail =
          error instanceof UnknownVideoProviderError ? error.message : String(error);
        problems.push(`${path}: ${detail}`);
      }
    }

    // Zod's reference() catches a typo'd person id, but only once the collection has synced.
    // Checking here too means the message names the project rather than the reference.
    for (const credit of project.data.team) {
      const id = credit.person?.id;
      if (id && !knownPeople.has(id)) {
        problems.push(`${path}: team credit references unknown person ${JSON.stringify(id)}`);
      }
      if (!id && !credit.name) {
        problems.push(`${path}: a team credit has neither \`person\` nor \`name\``);
      }
    }
  }

  // 3. At most two services in the header — a third breaks the header layout (D16).
  const inHeader = services.filter((s) => s.data.inHeader);
  if (inHeader.length > 2) {
    problems.push(
      `services.yaml: ${inHeader.length} services flagged inHeader (${inHeader
        .map((s) => s.id)
        .join(', ')}), maximum is 2`,
    );
  }

  // 4. Every portal service has a name and a resolvable url.
  for (const service of services.filter((s) => s.data.onPortal)) {
    if (!service.data.url) {
      problems.push(`services.yaml: ${JSON.stringify(service.id)} is on the portal but has no url`);
    }
    if (!service.data.name) {
      problems.push(`services.yaml: ${JSON.stringify(service.id)} is on the portal but has no name`);
    }
  }

  // 5. No two projects collide on the generated OG filename.
  const ogSlugs = new Map<string, string>();
  for (const project of projects) {
    const slug = project.id.toLowerCase();
    const existing = ogSlugs.get(slug);
    if (existing) problems.push(`projects: duplicate og slug ${JSON.stringify(slug)} (${existing}, ${project.id})`);
    ogSlugs.set(slug, project.id);
  }

  // 6. Warn only — the homepage falls back to the three newest when there aren't three featured.
  const featured = projects.filter((p) => p.data.featured && !p.data.draft).length;
  if (featured > 0 && featured < 3) {
    warnings.push(
      `projects: ${featured} project(s) marked \`featured: true\` — the /club featured row wants 3 ` +
        `or none, and is falling back to the three newest.`,
    );
  }

  for (const warning of warnings) console.warn(`[content] ${warning}`);
  if (problems.length > 0) throw new ContentError(problems);
}

/** Cheap "did you mean" — edit distance ≤ 2 against the controlled vocabulary. */
function nearest(value: string, candidates: string[]): string | undefined {
  let best: string | undefined;
  let bestDistance = 3;
  for (const candidate of candidates) {
    const distance = editDistance(value, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i]![j] = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
    }
  }
  return rows[a.length]![b.length]!;
}
