import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../src/i18n/languages';
import { alternates, fill, list, localizedPath, stripLocale, subtree, t } from '../src/i18n';

const root = join(__dirname, '..', 'src', 'i18n', 'locales');
const FILES = ['core.json', 'tool.json', 'pages.json', 'legal.json', 'guides.json'];

function flatten(value: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (typeof value === 'string') out[prefix] = value;
  else if (Array.isArray(value)) {
    out[`${prefix}#length`] = String(value.length);
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

const load = (code: string, file: string) =>
  flatten(JSON.parse(readFileSync(join(root, code, file), 'utf8')));
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('locale files', () => {
  it('has exactly one folder per configured language', () => {
    const dirs = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(dirs).toEqual(LANGUAGES.map((l) => l.code).sort());
    expect(LANGUAGES).toHaveLength(20);
  });

  for (const { code } of LANGUAGES) {
    describe(code, () => {
      it('has all five files', () => {
        for (const f of FILES) expect(existsSync(join(root, code, f)), `${code}/${f}`).toBe(true);
      });

      for (const file of FILES) {
        it(`${file}: same keys and list lengths as English, no empty values, placeholders intact`, () => {
          const en = load('en', file);
          const tr = load(code, file);
          expect(Object.keys(tr).sort()).toEqual(Object.keys(en).sort());
          for (const [key, value] of Object.entries(tr)) {
            if (key.endsWith('#length')) continue;
            expect(value.trim(), `${code}/${file}:${key} is empty`).not.toBe('');
            expect(placeholders(value), `${code}/${file}:${key} placeholders`).toBe(placeholders(en[key]!));
          }
        });
      }

      if (code !== 'en') {
        it('is actually translated (long texts are not left in English)', () => {
          for (const file of FILES) {
            const en = load('en', file);
            const tr = load(code, file);
            const copied = Object.keys(en).filter(
              (k) => !k.endsWith('#length') && en[k]!.length > 60 && tr[k] === en[k] && !k.endsWith('locationValue'),
            );
            expect(copied, `${code}/${file} still English: ${copied.slice(0, 3).join(', ')}`).toEqual([]);
          }
        });
      }
    });
  }
});

describe('helpers', () => {
  it('t() replaces placeholders and falls back to English', () => {
    expect(t('en', 'language.suggestText', { language: 'Español' })).toBe('View this site in Español?');
    expect(t('xx', 'ads.label')).toBe('Advertisement');
  });

  it('list() and subtree() read arrays and groups, falling back to English', () => {
    expect(list<{ title: string }>('en', 'home.how.steps')).toHaveLength(3);
    expect(list('xx', 'home.how.steps')).toHaveLength(3);
    expect(list('en', 'no.such.path')).toEqual([]);
    expect(Object.keys(subtree('en', 'tool.presets.words')).length).toBeGreaterThan(5);
  });

  it('fill() replaces known placeholders only', () => {
    expect(fill('Hi {name}, {other}', { name: 'A' })).toBe('Hi A, {other}');
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
