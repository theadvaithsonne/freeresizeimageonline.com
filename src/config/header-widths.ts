/**
 * From which window width (in rem, 1rem = 16px in a media query) the header shows the words next to the live numbers
 * ("12,345 images resized", "1 online now"). Below that it shows the numbers with their icons only (the words stay in the
 * tooltip and for screen readers). Long translations need more room than English, so each language has its own value,
 * measured in a real browser so that the logo never gets squeezed (re-measure after changing the counter texts, the tab
 * names or the language names). Languages that are not listed use the widest value.
 * Allowed values: 90, 100, 110, 120, 135 (each has a rule in Counters.astro).
 */
export const COUNTER_WORDS_FROM: Record<string, 90 | 100 | 110 | 120 | 135> = {
  en: 90,
  hi: 90,
  es: 120,
  'pt-br': 100,
  fr: 100,
  de: 90,
  id: 110,
  ar: 90,
  ru: 110,
  tr: 100,
  ja: 90,
  ko: 90,
  vi: 100,
  it: 90,
  th: 90,
  pl: 100,
  nl: 100,
  bn: 90,
  ur: 90,
  'zh-cn': 90,
};
