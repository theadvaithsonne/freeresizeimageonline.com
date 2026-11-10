import { describe, expect, it } from 'vitest';
import { LANGUAGES } from '../src/i18n/languages';
import { formatBytes, formatLength, formatNumber, formatPercent } from '../src/i18n/format';

describe('formatting', () => {
  it('formats numbers with locale separators', () => {
    expect(formatNumber('en', 1920)).toBe('1,920');
    expect(formatNumber('de', 1920.5)).toBe('1.920,5');
    expect(formatNumber('fr', 1920)).toMatch(/^1\s920$/);
  });

  it('always uses Latin digits, even for Arabic, Urdu, Bengali and Hindi', () => {
    for (const code of ['ar', 'ur', 'bn', 'hi', 'th']) {
      expect(formatNumber(code, 1234)).toMatch(/^[\d\s.,٬٫  ]+$/);
      expect(formatNumber(code, 1234)).not.toMatch(/[٠-٩۰-۹০-৯०-९]/);
    }
  });

  it('formats byte sizes using 1024-based units', () => {
    expect(formatBytes('en', 500)).toBe('500 B');
    expect(formatBytes('en', 50 * 1024)).toBe('50 KB');
    expect(formatBytes('en', 1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('formats lengths and percentages', () => {
    expect(formatLength('en', 1080, 'px')).toBe('1,080 px');
    expect(formatLength('en', 3.5, 'cm')).toMatch(/3\.5\s?cm/);
    expect(formatPercent('en', 50)).toBe('50%');
  });

  it('works for every configured language without throwing', () => {
    for (const { code } of LANGUAGES) {
      expect(() => formatBytes(code, 123456)).not.toThrow();
      expect(() => formatLength(code, 4.5, 'mm')).not.toThrow();
      expect(() => formatLength(code, 8, 'in')).not.toThrow();
    }
  });
});
