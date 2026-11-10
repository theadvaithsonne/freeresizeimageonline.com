/**
 * Every page of the site (without language prefix). Used for the sitemap, the "more tools" links,
 * and to keep slugs in one place. Each page exists in all 20 languages.
 */
export interface ToolRoute {
  /** Key under "pages" in the locale files, e.g. "kb" -> pages.kb.* and pages.nav.kb */
  key: 'home' | 'kb' | 'cm' | 'passport' | 'social' | 'convert' | 'compress';
  path: string;
}

export const TOOL_ROUTES: ToolRoute[] = [
  { key: 'home', path: '/' },
  { key: 'kb', path: '/resize-image-to-kb/' },
  { key: 'cm', path: '/resize-image-in-cm/' },
  { key: 'passport', path: '/passport-photo-size/' },
  { key: 'social', path: '/social-media-image-sizes/' },
  { key: 'convert', path: '/convert-image/' },
  { key: 'compress', path: '/compress-image/' },
];

export const LEGAL_ROUTES = [
  { key: 'about', path: '/about/' },
  { key: 'contact', path: '/contact/' },
  { key: 'privacy', path: '/privacy/' },
  { key: 'terms', path: '/terms/' },
] as const;

/** Written guides (articles). Text lives under "guides.<key>" in the locale files. */
export const GUIDES_INDEX_PATH = '/guides/';
export const GUIDE_ROUTES = [
  { key: 'reduce', path: '/guides/reduce-image-size/' },
  { key: 'formats', path: '/guides/jpg-vs-png-vs-webp/' },
  { key: 'forms', path: '/guides/photo-size-for-online-forms/' },
] as const;
/** Date the guides were published / last reviewed (shown to search engines as structured data). */
export const GUIDES_DATE = '2026-11-11';

export const ALL_PATHS: string[] = [
  ...TOOL_ROUTES.map((r) => r.path),
  GUIDES_INDEX_PATH,
  ...GUIDE_ROUTES.map((r) => r.path),
  ...LEGAL_ROUTES.map((r) => r.path),
];
