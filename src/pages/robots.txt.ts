import type { APIRoute } from 'astro';

/**
 * Generated rather than committed, so the sitemap URL always carries the domain this image was
 * actually built for. A hardcoded robots.txt is how a staging build ends up telling Google about
 * localhost (08-deployment.md §2).
 */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site).href;
  return new Response(
    [
      'User-agent: *',
      'Allow: /',
      // The full-resolution committed originals (D9). They are meant to be LINKED — the lightbox's
      // "View original" is the permanent URL for an image (D28) — but not crawled: they are
      // multi-megabyte files whose optimized variants are already indexed from the page.
      'Disallow: /originals/',
      'Disallow: /styleguide',
      '',
      `Sitemap: ${sitemap}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
