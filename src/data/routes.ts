/**
 * Every page of the site (without language prefix). Used for the sitemap, the "more tools" links,
 * and to keep slugs in one place. Each page exists in all 20 languages.
 */
export type ToolKey =
  | 'home'
  | 'kb'
  | 'cm'
  | 'passport'
  | 'social'
  | 'convert'
  | 'compress'
  | 'kb10'
  | 'kb20'
  | 'kb30'
  | 'kb50'
  | 'kb100'
  | 'kb200'
  | 'kb500'
  | 'mb1'
  | 'signature'
  | 'pixels'
  | 'bulk'
  | 'pngToJpg'
  | 'jpgToPng'
  | 'webpToJpg'
  | 'jpgToWebp'
  | 'pngToWebp'
  | 'kb300'
  | 'mb2'
  | 'imageToPdf'
  | 'jpgToPdf'
  | 'pngToPdf'
  | 'cmToPx'
  | 'inToPx'
  | 'mmToPx'
  | 'pxToCm'
  | 'webpToPng'
  | 'gifToJpg'
  | 'bmpToJpg'
  | 'avifToJpg'
  | 'jfifToJpg'
  | 'pxToIn'
  | 'pxToMm'
  | 'paperPx'
  | 'instagramSize'
  | 'youtubeSize'
  | 'facebookSize'
  | 'whatsappSize'
  | 'kb150'
  | 'mb5'
  | 'kb15'
  | 'kb25';

/** Heading under which a page is listed in the menu and the footer (text: "navGroups.<group>"). */
export type NavGroup = 'tools' | 'sizes' | 'convert';

export interface ToolRoute {
  /** Key in the locale files, e.g. "kb" -> kb.* (page text), nav.kb (short name) and blurb */
  key: ToolKey;
  path: string;
  group: NavGroup;
  /** Shown in the strip of tool links under the header on wide screens (the other pages are in the menu and footer). */
  strip: boolean;
  /** Landing pages belong to a main page: that tab is highlighted in the strip while you are on them. */
  parent?: ToolKey;
}

export const TOOL_ROUTES: ToolRoute[] = [
  // The strip of tool links under the header shows the pages marked `strip`, in this order.
  { key: 'home', path: '/', group: 'tools', strip: true },
  { key: 'kb', path: '/resize-image-to-kb/', group: 'sizes', strip: true },
  { key: 'cm', path: '/resize-image-in-cm/', group: 'tools', strip: true },
  { key: 'passport', path: '/passport-photo-size/', group: 'tools', strip: true },
  { key: 'social', path: '/social-media-image-sizes/', group: 'tools', strip: true },
  { key: 'convert', path: '/convert-image/', group: 'convert', strip: true },
  { key: 'compress', path: '/compress-image/', group: 'tools', strip: true },
  { key: 'imageToPdf', path: '/image-to-pdf/', group: 'convert', strip: true },
  // Dedicated landing pages for the most searched tasks (listed in the menu and the footer).
  { key: 'kb10', path: '/resize-image-to-10kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb20', path: '/resize-image-to-20kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb30', path: '/resize-image-to-30kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb50', path: '/resize-image-to-50kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb100', path: '/resize-image-to-100kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb200', path: '/resize-image-to-200kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb500', path: '/resize-image-to-500kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'mb1', path: '/resize-image-to-1mb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb300', path: '/resize-image-to-300kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'mb2', path: '/resize-image-to-2mb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'signature', path: '/resize-signature/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'pixels', path: '/resize-image-in-pixels/', group: 'tools', strip: false, parent: 'home' },
  { key: 'bulk', path: '/bulk-image-resizer/', group: 'tools', strip: false, parent: 'home' },
  { key: 'pngToJpg', path: '/png-to-jpg/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'jpgToPng', path: '/jpg-to-png/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'webpToJpg', path: '/webp-to-jpg/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'jpgToWebp', path: '/jpg-to-webp/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'pngToWebp', path: '/png-to-webp/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'jpgToPdf', path: '/jpg-to-pdf/', group: 'convert', strip: false, parent: 'imageToPdf' },
  { key: 'pngToPdf', path: '/png-to-pdf/', group: 'convert', strip: false, parent: 'imageToPdf' },
  // Size converters (cm, mm, inches and pixels)
  { key: 'cmToPx', path: '/cm-to-pixels/', group: 'tools', strip: false, parent: 'cm' },
  { key: 'inToPx', path: '/inches-to-pixels/', group: 'tools', strip: false, parent: 'cm' },
  { key: 'mmToPx', path: '/mm-to-pixels/', group: 'tools', strip: false, parent: 'cm' },
  { key: 'pxToCm', path: '/pixels-to-cm/', group: 'tools', strip: false, parent: 'cm' },
  { key: 'pxToIn', path: '/pixels-to-inches/', group: 'tools', strip: false, parent: 'cm' },
  { key: 'pxToMm', path: '/pixels-to-mm/', group: 'tools', strip: false, parent: 'cm' },
  { key: 'paperPx', path: '/paper-sizes-in-pixels/', group: 'tools', strip: false, parent: 'cm' },
  // Platform size pages (the resizer with the platform's sizes preset)
  { key: 'instagramSize', path: '/instagram-image-size/', group: 'tools', strip: false, parent: 'social' },
  { key: 'youtubeSize', path: '/youtube-thumbnail-size/', group: 'tools', strip: false, parent: 'social' },
  { key: 'facebookSize', path: '/facebook-image-size/', group: 'tools', strip: false, parent: 'social' },
  { key: 'whatsappSize', path: '/whatsapp-dp-size/', group: 'tools', strip: false, parent: 'social' },
  // More format converters and exact file sizes
  { key: 'webpToPng', path: '/webp-to-png/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'gifToJpg', path: '/gif-to-jpg/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'bmpToJpg', path: '/bmp-to-jpg/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'avifToJpg', path: '/avif-to-jpg/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'jfifToJpg', path: '/jfif-to-jpg/', group: 'convert', strip: false, parent: 'convert' },
  { key: 'kb15', path: '/resize-image-to-15kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb25', path: '/resize-image-to-25kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'kb150', path: '/resize-image-to-150kb/', group: 'sizes', strip: false, parent: 'kb' },
  { key: 'mb5', path: '/resize-image-to-5mb/', group: 'sizes', strip: false, parent: 'kb' },
];

export const NAV_GROUPS: NavGroup[] = ['tools', 'sizes', 'convert'];

/** Tool pages in a group, in display order. */
export function routesInGroup(group: NavGroup): ToolRoute[] {
  return TOOL_ROUTES.filter((r) => r.group === group);
}

/**
 * "More free tools" for a page: the other pages of its own group first (closest in purpose), then the rest,
 * limited so the list stays short. The home page is listed last because every page already links to it.
 */
export function relatedRoutes(currentKey: string, limit = 9): ToolRoute[] {
  const current = TOOL_ROUTES.find((r) => r.key === currentKey);
  const others = TOOL_ROUTES.filter((r) => r.key !== currentKey && r.key !== 'home');
  const sameGroup = others.filter((r) => r.group === current?.group);
  const rest = others.filter((r) => r.group !== current?.group);
  return [...sameGroup, ...rest].slice(0, limit);
}

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

/** One page with every question and answer, grouped by tool (linked from the header, the menu and the footer). */
export const FAQ_PATH = '/faq/';

export const ALL_PATHS: string[] = [
  ...TOOL_ROUTES.map((r) => r.path),
  FAQ_PATH,
  GUIDES_INDEX_PATH,
  ...GUIDE_ROUTES.map((r) => r.path),
  ...LEGAL_ROUTES.map((r) => r.path),
];
