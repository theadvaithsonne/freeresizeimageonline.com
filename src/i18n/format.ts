/**
 * Locale-aware number/unit formatting.
 *
 * Digits are always Latin (0-9), even for Arabic/Bengali/Urdu/etc. Reason: the numeric inputs in the
 * tool only accept ASCII digits, so showing other digit systems elsewhere would be confusing.
 */
import { getLanguage } from './languages';

function locale(lang: string): string {
  return `${getLanguage(lang).htmlLang}-u-nu-latn`;
}

export function formatNumber(lang: string, value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits }).format(value);
}

export function formatPercent(lang: string, value: number): string {
  return new Intl.NumberFormat(locale(lang), { style: 'percent', maximumFractionDigits: 0 }).format(
    value / 100,
  );
}

export type LengthUnit = 'px' | 'cm' | 'mm' | 'in';

const INTL_UNIT: Record<Exclude<LengthUnit, 'px'>, string> = {
  cm: 'centimeter',
  mm: 'millimeter',
  in: 'inch',
};

/** "1,920 px", "3.5 cm" ... with localized unit names/spacing. */
export function formatLength(lang: string, value: number, unit: LengthUnit): string {
  if (unit === 'px') {
    return `${formatNumber(lang, value, 0)} px`;
  }
  return new Intl.NumberFormat(locale(lang), {
    style: 'unit',
    unit: INTL_UNIT[unit],
    unitDisplay: 'short',
    maximumFractionDigits: 2,
  }).format(value);
}

/** File size, e.g. 48,200 -> "47 KB", 3,500,000 -> "3.3 MB". Uses 1024-based units like operating systems do. */
export function formatBytes(lang: string, bytes: number): string {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  if (bytes < KB) return `${formatNumber(lang, bytes, 0)} B`;
  if (bytes < MB) return `${formatNumber(lang, bytes / KB, bytes < 10 * KB ? 1 : 0)} KB`;
  if (bytes < GB) return `${formatNumber(lang, bytes / MB, 1)} MB`;
  return `${formatNumber(lang, bytes / GB, 2)} GB`;
}

/** Compact count for counters, e.g. 1,234,567 -> "1.2M" (locale-appropriate). */
export function formatCompact(lang: string, value: number): string {
  return new Intl.NumberFormat(locale(lang), { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatDate(lang: string, date: Date | string | number): string {
  return new Intl.DateTimeFormat(`${getLanguage(lang).htmlLang}-u-nu-latn`, {
    dateStyle: 'long',
  }).format(new Date(date));
}
