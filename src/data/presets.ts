/**
 * Size presets. Data only: add or edit entries here and the tool picks them up in every language.
 * Names of platforms/countries are proper nouns (not translated); generic words use `tool.presets.words.*`.
 * Document sizes are common requirements - the UI reminds users to check the official rules.
 */
import type { FitMode, LengthUnit } from '../engine/types';

export type PresetWord =
  | 'post'
  | 'story'
  | 'cover'
  | 'banner'
  | 'thumbnail'
  | 'profile'
  | 'passport'
  | 'visa'
  | 'idPhoto'
  | 'maxSize'
  | 'product'
  | 'favicon'
  | 'email'
  | 'screen';

export type PresetGroupId = 'social' | 'documents' | 'forms' | 'marketplaces' | 'web';

interface Base {
  /** Stable id, also usable in URLs (?preset=ig-post). */
  id: string;
  /** Proper noun shown first (platform or country). */
  name?: string;
  /** Generic translated word. */
  word?: PresetWord;
  /** Language-neutral detail, e.g. "1080x1080". */
  detail: string;
}

export interface SizePreset extends Base {
  kind: 'size';
  width: number;
  height?: number;
  unit: LengthUnit;
  dpi: number;
  fit: FitMode;
  /** Suggested output format for this preset (otherwise "same as original"). */
  format?: 'jpeg' | 'png' | 'webp';
}

export interface TargetPreset extends Base {
  kind: 'target';
  /** Maximum file size in KB (1 KB = 1024 bytes). */
  kb: number;
}

export type Preset = SizePreset | TargetPreset;

export interface PresetGroup {
  id: PresetGroupId;
  presets: Preset[];
}

const px = (
  id: string,
  name: string | undefined,
  word: PresetWord | undefined,
  width: number,
  height: number | undefined,
  fit: FitMode = 'crop',
): SizePreset => ({
  kind: 'size',
  id,
  name,
  word,
  width,
  height,
  unit: 'px',
  dpi: 96,
  fit,
  detail: height ? `${width}x${height}` : `${width} px`,
});

const mm = (id: string, name: string, word: PresetWord, w: number, h: number): SizePreset => ({
  kind: 'size',
  id,
  name,
  word,
  width: w,
  height: h,
  unit: 'mm',
  dpi: 300,
  fit: 'crop',
  format: 'jpeg',
  detail: `${w}x${h} mm`,
});

const kb = (kbValue: number): TargetPreset => ({
  kind: 'target',
  id: `kb-${kbValue}`,
  word: 'maxSize',
  kb: kbValue,
  detail: kbValue >= 1024 ? `${kbValue / 1024} MB` : `${kbValue} KB`,
});

export const PRESET_GROUPS: PresetGroup[] = [
  {
    id: 'social',
    presets: [
      px('ig-post', 'Instagram', 'post', 1080, 1080),
      px('ig-portrait', 'Instagram', 'post', 1080, 1350),
      px('ig-story', 'Instagram', 'story', 1080, 1920),
      px('fb-post', 'Facebook', 'post', 1200, 630),
      px('fb-cover', 'Facebook', 'cover', 820, 312),
      px('yt-thumb', 'YouTube', 'thumbnail', 1280, 720),
      px('yt-banner', 'YouTube', 'banner', 2560, 1440),
      px('x-post', 'X', 'post', 1600, 900),
      px('x-header', 'X', 'banner', 1500, 500),
      px('li-banner', 'LinkedIn', 'banner', 1584, 396),
      px('pin', 'Pinterest', 'post', 1000, 1500),
      px('wa-dp', 'WhatsApp', 'profile', 500, 500),
    ],
  },
  {
    id: 'documents',
    presets: [
      {
        kind: 'size',
        id: 'passport-us',
        name: 'US',
        word: 'passport',
        width: 2,
        height: 2,
        unit: 'in',
        dpi: 300,
        fit: 'crop',
        format: 'jpeg',
        detail: '2x2 in',
      },
      {
        kind: 'size',
        id: 'visa-us',
        name: 'US',
        word: 'visa',
        width: 2,
        height: 2,
        unit: 'in',
        dpi: 300,
        fit: 'crop',
        format: 'jpeg',
        detail: '2x2 in',
      },
      mm('passport-uk', 'UK', 'passport', 35, 45),
      mm('passport-eu', 'EU / Schengen', 'passport', 35, 45),
      mm('visa-schengen', 'Schengen', 'visa', 35, 45),
      mm('passport-au', 'Australia', 'passport', 35, 45),
      mm('passport-ca', 'Canada', 'passport', 50, 70),
      mm('visa-cn', 'China', 'visa', 33, 48),
      mm('pan-in', 'India PAN', 'idPhoto', 25, 35),
    ],
  },
  {
    id: 'forms',
    presets: [kb(20), kb(50), kb(100), kb(200), kb(500), kb(1024)],
  },
  {
    id: 'marketplaces',
    presets: [
      px('amazon', 'Amazon', 'product', 2000, 2000, 'fit'),
      px('shopify', 'Shopify', 'product', 2048, 2048, 'fit'),
      px('ebay', 'eBay', 'product', 1600, 1600, 'fit'),
    ],
  },
  {
    id: 'web',
    presets: [
      px('hd', undefined, 'screen', 1280, 720, 'fit'),
      px('fullhd', undefined, 'screen', 1920, 1080, 'fit'),
      px('email-600', undefined, 'email', 600, undefined, 'fit'),
      px('thumb-150', undefined, 'thumbnail', 150, 150),
      px('favicon-512', undefined, 'favicon', 512, 512),
    ],
  },
];

export function findPreset(id: string): Preset | undefined {
  for (const group of PRESET_GROUPS) {
    const hit = group.presets.find((p) => p.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Display label built from proper noun + translated word + neutral detail. */
export function presetLabel(preset: Preset, words: Record<string, string>): string {
  return [preset.name, preset.word ? words[preset.word] : undefined, preset.detail]
    .filter(Boolean)
    .join(' · ');
}
