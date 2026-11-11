# Google AdSense policy checklist

Sources: Google's official pages read on 2026-11-10 - AdSense Program policies (updated Aug 4, 2026), Eligibility
requirements, Google Publisher Policies, Ad placement policies, Supported languages, and the privacy-policy
"Required content" article. Policies change; re-read them before every big change and when AdSense sends a notice.

Legend: **Done** = implemented and live. **You** = only the account owner can do it in AdSense.

## 1. Eligibility and account
| Requirement | Status |
|---|---|
| Publisher is 18+, owns the site, can edit its HTML | **You** confirm. Site is yours; the code snippet, `google-adsense-account` meta tag and `ads.txt` are live for verification |
| Own, high-quality content | Done: original how-to text, tips, an explanatory section, FAQ and size tables on 14 tool pages, plus 3 written guides and a guides index, all in 20 languages. Every page that shows ads has 700 to 1,000+ words (the guides index 350) |
| Site language supported | Done: all 20 languages are on Google's supported-language list |
| Working, finished site | Done: live over HTTPS, 481 pages (24 pages x 20 languages + 404), no placeholder text |

## 2. Required pages and disclosures
| Requirement | Status |
|---|---|
| Privacy policy that discloses data use, that Google and third parties use cookies for ads based on earlier visits, and how to opt out of personalised ads | Done: `/privacy/` (all languages) incl. links to Google Ads Settings, how Google uses data, aboutads.info |
| Privacy policy reachable from every page | Done: footer link on every page |
| Honest publisher identity (no concealed information) | Done: owner name and email on About, Contact, Privacy, Terms |
| Contact and About pages (not mandatory, but a trust signal) | Done |
| Postal address on the site | Not required by Google's published policies; kept off the site (entered privately in AdSense) |

## 3. Consent (EEA, UK, Switzerland)
| Requirement | Status |
|---|---|
| Consent through a Google-certified consent platform before personalised ads | **You**: AdSense -> **Privacy & messaging** -> create the EEA/UK/Switzerland consent message (free). Takes 2 minutes; the code needs no change |
| Visitors can change their choice later | Done: the EEA/UK/Switzerland message "FreeResizeImageOnline EU" was published on 2026-11-11 (English + 7 languages) and `consentMessage` is `true` in `src/config/site.ts`. The footer link "Cookie settings" re-opens Google's message, on pages where Google's script is loaded and only for visitors who get that message. The US message "FreeResizeImageOnline US" (all supported US states, with Google's own opt-out link) was published the same day |
| Own analytics/cookies | Done: no analytics cookies; only theme/language choices are saved in the browser; Cloudflare Web Analytics is cookie-free |

## 4. Ad placement
| Policy | Status |
|---|---|
| Label ads only "Advertisement" / "Sponsored Links" | Done: label above each box (translated word for "Advertisement") |
| No ads near buttons that cause accidental clicks | Done: the desktop box sits in its own column (not sticky, it does not follow the page) with a gap of 4.5rem; on phones one box sits under the results (separated by a line and a wide gap) and one after the how-to section, never next to Resize / Download / ZIP. Only boxes that are visible are filled, and a box that becomes visible later (the results box) is filled at that moment |
| Ads must not look like navigation, menus or download links | Done: separate bordered box with label; no arrows or "click here" |
| No pop-ups, pop-unders, interstitials, auto-refresh | Done: none exist; ads are never refreshed |
| No ads on pages without publisher content / thin pages | Done: legal pages, the 404 page and the guides index (mostly a list of links) carry no ads; every other ad page has 700 words or more |
| No ads in modals, loading or empty states | Done |
| No incentives to click, no asking for clicks | Done: nothing is shown before real ad units exist (no empty "Advertisement" boxes, no "support us" text); no arrows, "click here" or rewards |
| Layout does not jump when ads load (Better Ads / user experience) | Done: fixed reserved heights; measured layout shift ~0 |
| Auto ads | Done: shown as OFF for freeresizeimageonline.com (Ads > By site, checked by the owner on 2026-11-11). Google's script still adds one empty, zero-height element (`adsbygoogle-noablate`); it has no visible effect. Manual placement is built in |
| Ad units | Done (2026-11-11): both responsive display units are created and set in `src/config/site.ts` - "Right column" (slot 3536472557, the ad column from 1200 px) and "Phone and tablet" (slot 1696118130, boxes under the how-to steps and under the results on smaller screens). Ads stay blank until AdSense has approved the site |
| Ad code modification | The loader (`Layout.astro`) creates the `ins` element only inside a visible box and calls the normal `adsbygoogle.push({})`; it never refreshes ads, hides units to manipulate them or triggers clicks. The inline unit is fixed-size (`data-full-width-responsive="false"`) so it fits its 336 px box |

## 5. Content policies
| Policy | Status |
|---|---|
| Illegal, dangerous, hateful, adult, deceptive, copyright-infringing content | None. Platform names (Instagram, YouTube, ...) are used only to state image sizes, and the Terms say the site is not affiliated with them |
| Misrepresentation | Done: claims are true ("images never leave your device" is how the tool works; counters, if enabled, show real numbers only; photo-ID sizes carry a reminder to check the official rules) |
| User-generated content / comments | None |
| Valuable inventory (not scraped, not auto-generated filler, not duplicated) | Done: every language has its own written text (reviewed by language, not pasted from English); pages differ in purpose; three original guides add depth. A native-speaker proof-read is still recommended |

## 6. Traffic and behaviour
| Policy | Status |
|---|---|
| No invalid clicks / never click your own ads | **You**: never click your own ads, and do not ask friends to |
| No paid-to-click, no unwanted-email traffic, no incentivised traffic | **You**: promote only through legitimate channels (search, social posts, forum answers) |
| Site behaviour: no redirects to unwanted sites, no automatic downloads, no malware | Done: downloads start only when the visitor presses a button |

## 7. Technical
| Item | Status |
|---|---|
| `ads.txt` with `google.com, pub-5152758693265080, DIRECT, f08c47fec0942fa0` | Done (`/ads.txt`) |
| Not blocking Google's crawler | Done: `robots.txt` allows everything; sitemap published |
| Fast, mobile friendly | Done: Lighthouse mobile performance 91-100, accessibility 100, SEO 100 |
| HTTPS | Done |

## 8. After approval
1. Create ad units, add slot ids, redeploy.
2. Create the consent message (section 3).
3. Check AdSense -> **Policy center** weekly for the first month.
4. Never place extra ads without re-checking the placement rules above.
