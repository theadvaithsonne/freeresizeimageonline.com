/**
 * The 20 launch languages. Step 3 builds routing, translations and the switcher on top of this.
 * `font` picks which script font stylesheet the page loads (Latin/Cyrillic/Vietnamese come from Inter).
 */
export type FontGroup =
  | 'latin'
  | 'devanagari'
  | 'arabic'
  | 'bengali'
  | 'thai'
  | 'jp'
  | 'kr'
  | 'sc';

export interface Language {
  /** URL segment, e.g. "hi" -> /hi/. English lives at the root. */
  code: string;
  /** BCP-47 tag used for <html lang> and hreflang. */
  htmlLang: string;
  /** Name in its own language, shown in the switcher. */
  nativeName: string;
  /** English name (for sorting/search in the switcher). */
  englishName: string;
  dir: 'ltr' | 'rtl';
  font: FontGroup;
}

export const DEFAULT_LANGUAGE = 'en';

export const LANGUAGES: readonly Language[] = [
  { code: 'en', htmlLang: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', font: 'latin' },
  { code: 'hi', htmlLang: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', font: 'devanagari' },
  { code: 'es', htmlLang: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', font: 'latin' },
  { code: 'pt-br', htmlLang: 'pt-BR', nativeName: 'Português (Brasil)', englishName: 'Portuguese (Brazil)', dir: 'ltr', font: 'latin' },
  { code: 'fr', htmlLang: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr', font: 'latin' },
  { code: 'de', htmlLang: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr', font: 'latin' },
  { code: 'id', htmlLang: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr', font: 'latin' },
  { code: 'ar', htmlLang: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', font: 'arabic' },
  { code: 'ru', htmlLang: 'ru', nativeName: 'Русский', englishName: 'Russian', dir: 'ltr', font: 'latin' },
  { code: 'tr', htmlLang: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr', font: 'latin' },
  { code: 'ja', htmlLang: 'ja', nativeName: '日本語', englishName: 'Japanese', dir: 'ltr', font: 'jp' },
  { code: 'ko', htmlLang: 'ko', nativeName: '한국어', englishName: 'Korean', dir: 'ltr', font: 'kr' },
  { code: 'vi', htmlLang: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', dir: 'ltr', font: 'latin' },
  { code: 'it', htmlLang: 'it', nativeName: 'Italiano', englishName: 'Italian', dir: 'ltr', font: 'latin' },
  { code: 'th', htmlLang: 'th', nativeName: 'ไทย', englishName: 'Thai', dir: 'ltr', font: 'thai' },
  { code: 'pl', htmlLang: 'pl', nativeName: 'Polski', englishName: 'Polish', dir: 'ltr', font: 'latin' },
  { code: 'nl', htmlLang: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', dir: 'ltr', font: 'latin' },
  { code: 'bn', htmlLang: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', dir: 'ltr', font: 'bengali' },
  // Urdu is rendered with Noto Sans Arabic (covers Urdu letters); Nastaliq is much heavier to load.
  { code: 'ur', htmlLang: 'ur', nativeName: 'اردو', englishName: 'Urdu', dir: 'rtl', font: 'arabic' },
  { code: 'zh-cn', htmlLang: 'zh-CN', nativeName: '简体中文', englishName: 'Chinese (Simplified)', dir: 'ltr', font: 'sc' },
] as const;

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]!;
}

/** Stylesheet paths (under /fonts) needed for a language: Inter for Latin text/digits + its script font. */
export const FONT_STYLESHEETS: Record<FontGroup, string[]> = {
  latin: ['inter'],
  devanagari: ['inter', 'noto-sans-devanagari'],
  arabic: ['inter', 'noto-sans-arabic'],
  bengali: ['inter', 'noto-sans-bengali'],
  thai: ['inter', 'noto-sans-thai'],
  // Japanese, Korean and Chinese use the device's own fonts (see the :lang() rules in tokens.css): shipping three
  // CJK web fonts would add ~350 files and 14 MB to the site for no visible benefit.
  jp: ['inter'],
  kr: ['inter'],
  sc: ['inter'],
};
