import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../src/i18n/languages';
import { alternates, localizedPath, stripLocale, t } from '../src/i18n';

const dir = join(__dirname, '..', 'src', 'i18n', 'locales');

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v as Record<string, unknown>, key));
  }
  return out;
}

const load = (code: string) =>
  flatten(JSON.parse(readFileSync(join(dir, `${code}.json`), 'utf8')) as Record<string, unknown>);

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('locale files', () => {
  const en = load('en');

  it('has exactly one file per configured language', () => {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''))
      .sort();
    expect(files).toEqual(LANGUAGES.map((l) => l.code).sort());
    expect(LANGUAGES).toHaveLength(20);
  });

  for (const { code } of LANGUAGES) {
    it(`${code}: same keys as English, no empty values, placeholders intact`, () => {
      const msgs = load(code);
      expect(Object.keys(msgs).sort()).toEqual(Object.keys(en).sort());
      for (const [key, value] of Object.entries(msgs)) {
        expect(value.trim(), `${code}:${key} is empty`).not.toBe('');
        expect(placeholders(value), `${code}:${key} placeholders`).toBe(placeholders(en[key]!));
      }
    });

    if (code !== 'en') {
      it(`${code}: key UI strings are actually translated (not left in English)`, () => {
        const msgs = load(code);
        for (const key of ['a11y.skipToContent', 'ads.label', 'badges.free', 'home.h1']) {
          expect(msgs[key], `${code}:${key} still English`).not.toBe(en[key]);
        }
      });
    }
  }
});

describe('helpers', () => {
  it('t() replaces placeholders and falls back to English', () => {
    expect(t('en', 'language.suggestText', { language: 'Español' })).toBe('View this site in Español?');
    expect(t('xx', 'ads.label')).toBe('Advertisement');
  });

  it('localizedPath() puts English at the root and others under their code', () => {
    expect(localizedPath('en', '/')).toBe('/');
    expect(localizedPath('hi', '/')).toBe('/hi/');
    expect(localizedPath('pt-br', '/resize/')).toBe('/pt-br/resize/');
  });

  it('stripLocale() removes only real language prefixes', () => {
    expect(stripLocale('/hi/resize/')).toBe('/resize/');
    expect(stripLocale('/pt-br/')).toBe('/');
    expect(stripLocale('/zh-cn')).toBe('/');
    expect(stripLocale('/resize/')).toBe('/resize/');
    expect(stripLocale('/en/')).toBe('/en/'); // English is never prefixed
  });

  it('alternates() lists every language', () => {
    const alts = alternates('/');
    expect(alts).toHaveLength(20);
    expect(alts.find((a) => a.language.code === 'ar')?.href).toBe('/ar/');
  });

  it('RTL languages are marked rtl', () => {
    const rtl = LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code);
    expect(rtl.sort()).toEqual(['ar', 'ur']);
  });
});
