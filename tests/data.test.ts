import { describe, expect, it } from 'vitest';
import { PRESET_GROUPS, findPreset, presetLabel } from '../src/data/presets';
import { ALL_PATHS, LEGAL_ROUTES, TOOL_ROUTES } from '../src/data/routes';
import { toPixels } from '../src/engine/units';
import { getMessages, subtree, t } from '../src/i18n';

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
});
