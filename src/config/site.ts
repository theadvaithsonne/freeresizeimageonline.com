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
    // "Right column": responsive display unit created in AdSense on 2026-11-11 (the wide-screen ad column)
    rail: '3536472557',
    // "Phone and tablet": responsive display unit created in AdSense on 2026-11-11 (boxes inside the page below 1200 px)
    inline: '1696118130',
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
/** The wide-screen ad column exists only once its unit is set; the boxes inside the page only once the inline unit is set. */
export const RAIL_ADS_LIVE = Boolean(ADSENSE.slots.rail);
export const INLINE_ADS_LIVE = Boolean(ADSENSE.slots.inline);

/**
 * Live counters. The Worker in worker/ is deployed on counters.freeresizeimageonline.com (2026-11-11).
 * Leave `endpoint` empty to switch the counters off everywhere (the privacy policy section about them also disappears).
 */
export const COUNTERS = {
  // PUBLIC_COUNTERS_ENDPOINT lets a test build talk to a stand-in server on this computer; it is not set for the real site.
  endpoint: (import.meta.env.PUBLIC_COUNTERS_ENDPOINT as string | undefined) || 'wss://counters.freeresizeimageonline.com/ws',
  /** Show the "images resized" number once it reaches this value (it is always the real number, never invented). */
  minTotalToShow: 1,
  /** Show "online now" once at least this many people are connected (a visitor counts as one). */
  minOnlineToShow: 1,
};

/**
 * The same service over plain HTTPS: a read of the two numbers. It is answered from the edge cache within a fraction of a
 * second, while the live WebSocket needs longer to open - so the "images resized" number shows at once and the socket
 * (which also carries the "online now" number and live updates) catches up behind it.
 */
export const COUNTERS_STATS_URL = COUNTERS.endpoint ? COUNTERS.endpoint.replace(/^ws/, 'http').replace(/\/ws$/, '/stats') : '';
