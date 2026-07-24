import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const siteUrl = new URL(import.meta.env.PUBLIC_SITE_URL);
  const sitemapUrl = new URL('/sitemap-index.xml', siteUrl).href;

  return new Response(`User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
