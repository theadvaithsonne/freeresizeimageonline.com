/**
 * Central site settings. Change values here, not in components.
 */
export const SITE = {
  name: 'FreeResizeImageOnline',
  url: 'https://freeresizeimageonline.com',
  owner: 'Advaith Bibhishan Sonne',
  contactEmail: 'theadvaithsonne@gmail.com',
  /** Governing law shown in the Terms of Service. */
  jurisdiction: { country: 'India', place: 'Bengaluru, Karnataka' },
  /** Date shown on legal pages (update when the text changes). */
  legalUpdated: '2026-11-10',
} as const;

/**
 * Google AdSense. Leave `client` empty until the AdSense account is approved (Step 14).
 * Then paste your publisher id ("ca-pub-XXXXXXXXXXXXXXXX") and the two ad unit slot ids.
 * While `client` is empty, the page shows the friendly placeholder box and loads NO Google code.
 */
export const ADSENSE = {
  client: 'ca-pub-5152758693265080',
  slots: {
    rail: '',
    inline: '',
  },
  /**
   * Set to true after you create the EEA/UK/Switzerland consent message in AdSense > Privacy & messaging.
   * It shows the "Cookie settings" link in the footer (the link re-opens that message). Until then the link is hidden,
   * because it would do nothing.
   */
  consentMessage: true as boolean,
};

/** True once at least one ad unit id is filled in above (ads can actually appear). */
export const ADS_LIVE = Boolean(ADSENSE.slots.rail || ADSENSE.slots.inline);

/**
 * Live counters (Step 7). Leave `endpoint` empty to hide the counters.
 * After deploying the Worker, set it to e.g. "wss://counters.freeresizeimageonline.com/ws".
 */
export const COUNTERS = {
  endpoint: '',
  /** Show the "images resized" number only once it reaches this value (it is always the real number). */
  minTotalToShow: 100,
  /** Show "online now" only once at least this many people are connected. */
  minOnlineToShow: 3,
} as const;
