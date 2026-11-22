// Static sitemap, generated at build time. Update `lastmod` when a page's content changes.
import type { APIRoute } from 'astro';
import { apps } from '../data/wider-benchmark';

const pages: { path: string; lastmod: string; priority: string }[] = [
  { path: '/', lastmod: '2026-11-07', priority: '1.0' },
  { path: '/how-it-works', lastmod: '2026-11-07', priority: '0.8' },
  { path: '/pricing', lastmod: '2026-11-07', priority: '0.8' },
  { path: '/simulator', lastmod: '2026-11-07', priority: '0.6' },
  { path: '/privacy-and-data', lastmod: '2026-11-07', priority: '0.6' },
  { path: '/research', lastmod: '2026-11-22', priority: '0.6' },
  { path: '/research/local-qwen-opus-validation', lastmod: '2026-11-21', priority: '0.7' },
  { path: '/research/wider-benchmark-9-cves', lastmod: '2026-11-22', priority: '0.7' },
  ...apps.map((a) => ({ path: `/research/${a.slug}`, lastmod: a.published, priority: '0.6' })),
  { path: '/early-access', lastmod: '2026-11-07', priority: '0.7' },
  { path: '/legal/imprint', lastmod: '2026-11-07', priority: '0.2' },
  { path: '/legal/privacy', lastmod: '2026-11-07', priority: '0.2' },
];

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://epicworks.cz');
  const urls = pages
    .map((p) => `  <url><loc>${new URL(p.path, base).href}</loc><lastmod>${p.lastmod}</lastmod><priority>${p.priority}</priority></url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
