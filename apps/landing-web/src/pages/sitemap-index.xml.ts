import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const siteUrl = new URL(import.meta.env.PUBLIC_SITE_URL);
  const homeUrl = siteUrl.href;
  const privacyUrl = new URL('/privacy', siteUrl).href;

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${homeUrl}</loc></url>
  <url><loc>${privacyUrl}</loc></url>
</urlset>
`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    },
  );
};
