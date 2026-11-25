// Coming soon period: only the home page is listed.
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://epicworks.cz/</loc><lastmod>2026-11-25</lastmod></url>
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
