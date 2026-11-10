import { describe, expect, it } from 'vitest';
import { PRESET_GROUPS, findPreset, presetLabel } from '../src/data/presets';
import { ALL_PATHS, GUIDE_ROUTES, LEGAL_ROUTES, NAV_GROUPS, TOOL_ROUTES, relatedRoutes, routesInGroup } from '../src/data/routes';
import { toPixels } from '../src/engine/units';
import { getMessages, subtree, t } from '../src/i18n';
import { safeJson } from '../src/i18n/safe-json';

const allPresets = PRESET_GROUPS.flatMap((g) => g.presets);

describe('presets', () => {
  it('have unique ids', () => {
    const ids = allPresets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('are valid', () => {
    for (const p of allPresets) {
      if (p.kind === 'size') {
        expect(p.width, p.id).toBeGreaterThan(0);
        if (p.height !== undefined) expect(p.height, p.id).toBeGreaterThan(0);
        expect(p.dpi, p.id).toBeGreaterThanOrEqual(72);
      } else {
        expect(p.kb, p.id).toBeGreaterThan(0);
      }
    }
  });

  it('every group has a translated title and every word is translated', () => {
    for (const g of PRESET_GROUPS) {
      expect(t('en', `tool.presets.groups.${g.id}` as 'tool.presets.groups.social')).not.toContain('tool.presets');
    }
    const words = subtree('en', 'tool.presets.words');
    for (const p of allPresets) if (p.word) expect(words[p.word], p.id).toBeTruthy();
  });

  it('converts passport sizes to the expected pixels at 300 DPI', () => {
    const uk = findPreset('passport-uk');
    const us = findPreset('passport-us');
    expect(uk && uk.kind === 'size' && [toPixels(uk.width, uk.unit, uk.dpi), toPixels(uk.height!, uk.unit, uk.dpi)]).toEqual([413, 531]);
    expect(us && us.kind === 'size' && [toPixels(us.width, us.unit, us.dpi), toPixels(us.height!, us.unit, us.dpi)]).toEqual([600, 600]);
  });

  it('builds labels from proper noun + translated word + detail', () => {
    const preset = findPreset('ig-story')!;
    expect(presetLabel(preset, { story: 'story / reel' })).toBe('Instagram · story / reel · 1080x1920');
    expect(presetLabel(findPreset('kb-1024')!, { maxSize: 'max file size' })).toBe('max file size · 1 MB');
  });

  it('every landing page that names a preset refers to a real one', () => {
    for (const id of ['kb-50', 'passport-us', 'ig-post']) expect(findPreset(id), id).toBeDefined();
  });
});

describe('routes', () => {
  it('have unique paths that start and end with a slash', () => {
    expect(new Set(ALL_PATHS).size).toBe(ALL_PATHS.length);
    for (const p of ALL_PATHS) expect(p).toMatch(/^\/([a-z0-9-]+\/)*$/);
  });

  it('every tool route has navigation text, and every legal route has page text', () => {
    const en = getMessages('en') as unknown as Record<string, Record<string, unknown>>;
    for (const r of TOOL_ROUTES) expect(en.nav![r.key], r.key).toBeTruthy();
    for (const r of LEGAL_ROUTES) expect((en.legal as Record<string, unknown>)[r.key], r.key).toBeTruthy();
  });

  it('every tool page has complete, search-friendly text', () => {
    const en = getMessages('en') as unknown as Record<string, any>;
    for (const r of TOOL_ROUTES.filter((x) => x.key !== 'home')) {
      const p = en[r.key];
      expect(p.title.length, `${r.key} title`).toBeLessThanOrEqual(60);
      expect(p.description.length, `${r.key} description`).toBeGreaterThanOrEqual(60);
      expect(p.description.length, `${r.key} description`).toBeLessThanOrEqual(160);
      expect(p.blurb, `${r.key} blurb`).toBeTruthy();
      expect(p.steps.length, `${r.key} steps`).toBe(3);
      expect(p.tips.length, `${r.key} tips`).toBeGreaterThanOrEqual(3);
      expect(p.details.length, `${r.key} details`).toBeGreaterThanOrEqual(2);
      expect(p.faq.items.length, `${r.key} faq`).toBeGreaterThanOrEqual(2);
    }
    for (const g of NAV_GROUPS) expect(en.navGroups[g], g).toBeTruthy();
  });

  it('groups every tool page once and lists related pages without the page itself or home', () => {
    expect(NAV_GROUPS.flatMap((g) => routesInGroup(g).map((r) => r.key)).sort()).toEqual(TOOL_ROUTES.map((r) => r.key).sort());
    for (const r of TOOL_ROUTES) {
      const related = relatedRoutes(r.key).map((x) => x.key);
      expect(related, r.key).not.toContain(r.key);
      expect(related, r.key).not.toContain('home');
      expect(related.length, r.key).toBeGreaterThan(3);
    }
    // Landing pages belong to a tab of the strip under the header.
    for (const r of TOOL_ROUTES.filter((x) => !x.strip)) expect(TOOL_ROUTES.find((x) => x.key === r.parent)?.strip, r.key).toBe(true);
  });

  it('every guide has a title, intro, sections and FAQ, and the index lists each guide in route order', () => {
    const guides = (getMessages('en') as unknown as { guides: Record<string, Record<string, unknown>> }).guides;
    for (const r of GUIDE_ROUTES) {
      const g = guides[r.key]!;
      expect(g.title, r.key).toBeTruthy();
      expect(g.h1, r.key).toBeTruthy();
      expect(g.intro, r.key).toBeTruthy();
      expect((g.sections as unknown[]).length, r.key).toBeGreaterThan(2);
      expect(((g.faq as { items: unknown[] }).items).length, r.key).toBeGreaterThan(0);
    }
    const items = (guides.index as { items: { title: string }[] }).items;
    expect(items.length).toBe(GUIDE_ROUTES.length);
    // The index page pairs item N with route N; the titles must agree with the guides' own headings.
    GUIDE_ROUTES.forEach((r, i) => expect(items[i]!.title.toLowerCase(), r.key).toContain(String(guides[r.key]!.h1).toLowerCase().slice(0, 12)));
  });
});

describe('structured data helper', () => {
  it('never lets text end a <script> block', () => {
    const text = `</script><script>alert(1)</script>${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}`;
    const json = safeJson({ text });
    expect(json).not.toContain('<');
    expect(json).not.toContain(String.fromCharCode(0x2028));
    expect(json).not.toContain(String.fromCharCode(0x2029));
    expect(JSON.parse(json).text).toBe(text); // the escapes decode back to the original text
  });
});
