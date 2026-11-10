import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { ALL_PATHS } from '../data/routes';
import { LANGUAGES, localizedPath } from '../i18n';

/**
 * One <url> per page per language, each listing all language versions (hreflang), as Google recommends.
 */
export const GET: APIRoute = () => {
  const abs = (path: string) => new URL(path, SITE.url).href;
  // The date of this build: every deploy regenerates the pages, so this is when they last changed.
  const lastmod = new Date().toISOString().slice(0, 10);

  const urls = ALL_PATHS.flatMap((path) =>
    LANGUAGES.map((lang) => {
      const loc = abs(localizedPath(lang.code, path));
      const alternates = LANGUAGES.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l.htmlLang}" href="${abs(localizedPath(l.code, path))}"/>`,
      ).join('\n');
      const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(localizedPath('en', path))}"/>`;
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alternates}\n${xDefault}\n  </url>`;
    }),
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
