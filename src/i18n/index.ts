import { DEFAULT_LANGUAGE, LANGUAGES, getLanguage, type Language } from './languages';
import type core from './locales/en/core.json';
import type tool from './locales/en/tool.json';
import type pages from './locales/en/pages.json';
import type legal from './locales/en/legal.json';
import type guides from './locales/en/guides.json';

/**
 * Every language has the same set of files under src/i18n/locales/<code>/ (core, tool, pages, legal).
 * English is the source of truth; tests verify the others match it.
 */
export type Messages = typeof core & typeof tool & typeof pages & typeof legal & typeof guides;

type Join<K extends string, P extends string> = `${K}.${P}`;
/** Dotted paths to string leaves. Arrays (steps, FAQ lists) are read with list() instead. */
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends readonly unknown[]
      ? never
      : Join<K, Paths<T[K]>>;
}[keyof T & string];

/** e.g. "home.h1" | "ads.label" - typos are compile errors (run `npm run check`). */
export type MessageKey = Paths<Messages>;

const modules = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', {
  eager: true,
  import: 'default',
});

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (value && typeof value === 'object' && existing && typeof existing === 'object') {
      deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
}

const catalog: Record<string, Messages> = {};
for (const [file, messages] of Object.entries(modules)) {
  const code = file.split('/')[2]!;
  catalog[code] ??= {} as Messages;
  deepMerge(catalog[code] as unknown as Record<string, unknown>, structuredClone(messages));
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

function pickNode(messages: Messages, path: string): unknown {
  let node: unknown = messages;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** A whole subtree (e.g. all "tool.options.*" strings) as a plain object - for passing to client scripts. */
export function subtree(lang: string, path: string): Record<string, unknown> {
  const wanted = pickNode(getMessages(lang), path) ?? pickNode(getMessages(DEFAULT_LANGUAGE), path);
  return (wanted ?? {}) as Record<string, unknown>;
}

/**
 * A list of strings or objects, e.g. list<{title: string; text: string}>(lang, 'kb.steps').
 * Falls back to English when the language has no such list.
 */
export function list<T = string>(lang: string, path: string): T[] {
  const wanted = pickNode(getMessages(lang), path) ?? pickNode(getMessages(DEFAULT_LANGUAGE), path);
  return Array.isArray(wanted) ? (wanted as T[]) : [];
}

/** Fill {placeholders} in any string (for text pulled from a list). */
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
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
