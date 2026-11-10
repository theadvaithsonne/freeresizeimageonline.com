import { DEFAULT_LANGUAGE, LANGUAGES, getLanguage, type Language } from './languages';
import type en from './locales/en.json';

/** Shape of every locale file. English is the source of truth; tests verify the others match it. */
export type Messages = typeof en;

type Join<K extends string, P extends string> = `${K}.${P}`;
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, Paths<T[K]>>;
}[keyof T & string];

/** e.g. "home.h1" | "ads.label" - typos are compile errors (run `npm run check`). */
export type MessageKey = Paths<Messages>;

const modules = import.meta.glob<Messages>('./locales/*.json', { eager: true, import: 'default' });

const catalog: Record<string, Messages> = {};
for (const [file, messages] of Object.entries(modules)) {
  const code = file.replace('./locales/', '').replace('.json', '');
  catalog[code] = messages;
}

export function getMessages(lang: string): Messages {
  return catalog[lang] ?? catalog[DEFAULT_LANGUAGE]!;
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Translate a key, replacing {placeholders}. Falls back to English, then to the key itself. */
export function t(lang: string, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = lookup(getMessages(lang), key) ?? lookup(getMessages(DEFAULT_LANGUAGE), key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Build a site path for a language: English at the root, others under /<code>/. `path` starts with "/". */
export function localizedPath(lang: string, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return lang === DEFAULT_LANGUAGE ? clean : `/${lang}${clean}`;
}

/** Remove a leading language segment: "/hi/resize/" -> "/resize/". */
export function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(\/.*)?$/);
  if (match && match[1] !== DEFAULT_LANGUAGE && LANGUAGES.some((l) => l.code === match[1])) {
    return match[2] ?? '/';
  }
  return pathname;
}

export interface Alternate {
  language: Language;
  /** Path (not absolute URL) of this page in `language`. */
  href: string;
}

/** All language versions of one page, for the switcher and <link rel="alternate" hreflang>. */
export function alternates(path = '/'): Alternate[] {
  return LANGUAGES.map((language) => ({ language, href: localizedPath(language.code, path) }));
}

/** Astro getStaticPaths helper: one entry per language; English has no prefix param. */
export function languageStaticPaths() {
  return LANGUAGES.map((language) => ({
    params: { lang: language.code === DEFAULT_LANGUAGE ? undefined : language.code },
    props: { lang: language.code },
  }));
}

export { LANGUAGES, DEFAULT_LANGUAGE, getLanguage };
export type { Language };
