/**
 * Video provider adapter (04-media.md §B1, D10).
 *
 * All four providers are first-class — the host is not fixed and may differ per project. Parsing
 * happens at BUILD time, so a malformed or unsupported URL fails the build with the offending file
 * path rather than rendering an empty black box in production that nobody notices for a month.
 *
 * Adding a fifth provider is one entry in PROVIDER_ORIGINS plus one case in `parseVideoUrl`. It
 * never touches a component, and the CSP `frame-src` updates itself (08-deployment.md §6).
 */

export type Provider = 'youtube' | 'rutube' | 'vk' | 'dzen';

export type Embed = {
  provider: Provider;
  /** Provider-native id. For VK this is the composite `-<oid>_<vid>`. */
  id: string;
  /** Injected into `src` on click — never rendered at page load. */
  embedUrl: string;
  /** Canonical page on the provider. The facade's no-JS fallback `href`. */
  watchUrl: string;
  /** Contributes to the generated CSP `frame-src`. */
  frameSrcOrigin: string;
  aspect: number;
};

export const PROVIDER_ORIGINS: Record<Provider, string> = {
  youtube: 'https://www.youtube-nocookie.com',
  rutube: 'https://rutube.ru',
  vk: 'https://vk.com',
  dzen: 'https://dzen.ru',
};

/** Display names, for the visible "Loads from …" note on the facade (04 §B2). */
export const PROVIDER_LABELS: Record<Provider, string> = {
  youtube: 'YouTube',
  rutube: 'Rutube',
  vk: 'VK Video',
  dzen: 'Dzen',
};

const DEFAULT_ASPECT = 16 / 9;

export class UnknownVideoProviderError extends Error {}

/**
 * Throws on an unrecognised host or an unparseable id. Callers in the build path should catch and
 * re-throw with the content file path attached (see src/lib/validate.ts).
 */
export function parseVideoUrl(url: string): Embed {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UnknownVideoProviderError(`not a valid URL: ${JSON.stringify(url)}`);
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  // ── YouTube: watch?v=ID · youtu.be/ID · /shorts/ID ─────────────────────────
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    const id =
      parsed.searchParams.get('v') ??
      parsed.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{6,})/)?.[1];
    if (id) return youtube(id);
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.match(/^\/([\w-]{6,})/)?.[1];
    if (id) return youtube(id);
  }

  // ── Rutube: rutube.ru/video/ID/ ────────────────────────────────────────────
  if (host === 'rutube.ru') {
    const id = parsed.pathname.match(/^\/(?:video|play\/embed)\/([0-9a-f]{32})/i)?.[1];
    if (id) {
      return {
        provider: 'rutube',
        id,
        embedUrl: `https://rutube.ru/play/embed/${id}`,
        watchUrl: `https://rutube.ru/video/${id}/`,
        frameSrcOrigin: PROVIDER_ORIGINS.rutube,
        aspect: DEFAULT_ASPECT,
      };
    }
  }

  // ── VK Video: vk.com/video-OID_VID · vkvideo.ru/video-OID_VID ──────────────
  if (host === 'vk.com' || host === 'vkvideo.ru' || host === 'm.vk.com') {
    const m = parsed.pathname.match(/^\/video(-?\d+)_(\d+)/);
    if (m) {
      const [, oid, vid] = m as unknown as [string, string, string];
      return {
        provider: 'vk',
        id: `${oid}_${vid}`,
        embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${vid}&hd=2`,
        watchUrl: `https://vk.com/video${oid}_${vid}`,
        frameSrcOrigin: PROVIDER_ORIGINS.vk,
        aspect: DEFAULT_ASPECT,
      };
    }
  }

  // ── Dzen: dzen.ru/video/watch/ID ───────────────────────────────────────────
  if (host === 'dzen.ru') {
    const id = parsed.pathname.match(/^\/(?:video\/watch|embed)\/([\w-]+)/)?.[1];
    if (id) {
      return {
        provider: 'dzen',
        id,
        embedUrl: `https://dzen.ru/embed/${id}`,
        watchUrl: `https://dzen.ru/video/watch/${id}`,
        frameSrcOrigin: PROVIDER_ORIGINS.dzen,
        aspect: DEFAULT_ASPECT,
      };
    }
  }

  throw new UnknownVideoProviderError(
    `unrecognised video host ${JSON.stringify(parsed.hostname)} — ` +
      `supported: ${Object.keys(PROVIDER_ORIGINS).join(', ')}`,
  );
}

function youtube(id: string): Embed {
  return {
    provider: 'youtube',
    id,
    // -nocookie: no cookie is set until the visitor actually plays something.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    frameSrcOrigin: PROVIDER_ORIGINS.youtube,
    aspect: DEFAULT_ASPECT,
  };
}

/**
 * The generated CSP `frame-src` value (04 §B3). Exactly as wide as the published content requires
 * and no wider — never `*`, and `'none'` when no project has a video.
 */
export function frameSrcFor(urls: readonly string[]): string {
  const origins = new Set<string>();
  for (const url of urls) origins.add(parseVideoUrl(url).frameSrcOrigin);
  return origins.size === 0 ? "'none'" : [...origins].sort().join(' ');
}
