'use strict';

// ─── Known Ad / Tracker Domains ────────────────────────────────────────────
const AD_DOMAINS = new Set([
  // Major ad networks
  'googlesyndication.com', 'doubleclick.net', 'googleadservices.com',
  'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
  'adnxs.com', 'amazon-adsystem.com', 'advertising.com',
  'taboola.com', 'outbrain.com', 'propellerads.com',
  'popads.net', 'popcash.net', 'popunder.net',
  'exoclick.com', 'trafficjunky.net', 'traffichouse.net',
  'plugrush.com', 'juicyads.com', 'hilltopads.net', 'hilltopads.com',
  'clickaine.com', 'adskeeper.co.uk', 'adskeeper.com',
  'mgid.com', 'revcontent.com', 'criteo.com', 'bidswitch.net',
  'openx.net', 'appnexus.com', 'rubiconproject.com',
  'pubmatic.com', 'casalemedia.com', 'indexww.com',
  'sharethrough.com', 'spotxchange.com', 'springserve.com',
  'lkqd.net', 'undertone.com', 'yieldmo.com', 'adsymptotic.com',
  'media.net', 'adsterra.com', 'adsterra.network',
  'atdmt.com', 'addthis.com', 'scorecardresearch.com',
  'quantserve.com', 'comscore.com', 'bluekai.com', 'demdex.net',
  // Streaming-site specific ad scripts
  'adsprimary.com', 'adsprime.com', 'adsbooth.net', 'adbooth.net',
  'ero-advertising.com', 'trafficfactory.biz', 'etahub.com',
  'go.flix.how', 'adfly.io', 'adf.ly', 'ouo.io', 'sh.st',
  'bc.vc', 'j.gs', 'linkshrink.net', 'shorte.st',
  // Malvertising / crypto miners
  'coinhive.com', 'coin-hive.com', 'webminepool.com',
  'cryptoloot.pro', 'jsecoin.com', 'papoto.com',
  // Trackers
  'hotjar.com', 'mixpanel.com', 'segment.io', 'segment.com',
  'intercom.io', 'fullstory.com', 'logrocket.com',
  // Popup/redirect networks common on free streaming sites
  'go.redirectingat.com', 'clkrev.com', 'clickshare.net',
  'bidvertiser.com', 'easyads.io', 'traffic.js.org',
  'popmagnet.com', 'popmyads.com', 'popads.net',
  'monetag.com', 'propush.me', 'onclickads.net',
  'adhitz.com', 'adcash.com', 'oxid.lt', 'ad2iction.com',
  'push.network', 'pushground.com', 'pushpush.net',
  'notix.io', 'onesignal.com', 'pushcrew.com',
  // Video ad providers
  'liveintent.com', 'vidoomy.com', 'vidyard.com',
  'yieldlab.net', 'primetime.ad.gt', 'spotx.tv',
  'freewheel.tv', 'innovid.com', 'tremormedia.com',
  'eyereturn.com', 'yume.com', 'videology.com',
]);

// ─── URL Pattern Blockers ────────────────────────────────────────────────────
const AD_URL_PATTERNS = [
  /\/ads?\//i,
  /\/advertisement\//i,
  /adserver/i,
  /adtag/i,
  /\/popup\//i,
  /popunder/i,
  /\/banner\//i,
  /[?&]ad_id=/i,
  /[?&]adtype=/i,
  /\/tracking\//i,
  /[?&]utm_source=/i,
  /clickthrough/i,
  /\/interstitial/i,
  /[?&]affiliate_id=/i,
];

// ─── Allowed CDN / Streaming Infrastructure Domains ─────────────────────────
const ALLOWED_CDN = [
  'cloudflare.com', 'cloudflare.net', 'cloudflareinsights.com',
  'fastly.net', 'akamaized.net', 'akamai.net', 'akamaihd.net',
  'cdnjs.com', 'cdnjs.cloudflare.com',
  'googleapis.com', 'gstatic.com', 'google.com',
  'jwplatform.com', 'jwpcdn.com', 'jwplayer.com',
  'vimeo.com', 'vimeocdn.com',
  'dailymotion.com', 'dmcdn.net',
  'streamtape.com', 'streamtape.cc', 'streamtape.net',
  'mixdrop.co', 'mixdrop.to', 'upstream.to',
  'filemoon.sx', 'filemoon.in', 'filemoon.to',
  'voe.sx', 'voe.st', 'voe.ch',
  'vidoza.net', 'doodstream.com', 'dood.pm',
  'vidmoly.to', 'megacloud.tv', 'megacloud.store',
  'rabbitstream.net', 'rapid-cloud.co', 'rapidcloud.cc',
  'embedrise.xyz', 'embed.su', 'smashy.stream',
  // Common subtitle providers
  'opensubtitles.org', 'subscene.com', 'subf2m.co',
  // Font / icon CDNs
  'fonts.googleapis.com', 'fonts.gstatic.com',
  'cdnjs.cloudflare.com', 'cdn.jsdelivr.net',
];

/**
 * Returns true if the URL should be blocked
 * @param {string} url
 * @returns {boolean}
 */
function isBlocked(url) {
  if (!url || !url.startsWith('http')) return false;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Never block allowed CDNs
    if (ALLOWED_CDN.some(cdn => hostname === cdn || hostname.endsWith('.' + cdn))) {
      return false;
    }

    // Check ad domain list
    if (AD_DOMAINS.has(hostname)) return true;
    for (const domain of AD_DOMAINS) {
      if (hostname.endsWith('.' + domain)) return true;
    }

    // Check URL patterns
    if (AD_URL_PATTERNS.some(p => p.test(url))) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Returns true if external navigation (from streaming site) should be blocked
 * @param {string} navUrl - URL being navigated to
 * @param {string} originUrl - Original streaming site URL
 * @returns {boolean}
 */
function isBlockedNavigation(navUrl, originUrl) {
  try {
    const navHost = new URL(navUrl).hostname.toLowerCase().replace(/^www\./, '');
    const origHost = new URL(originUrl).hostname.toLowerCase().replace(/^www\./, '');

    // Allow same domain / subdomains
    if (navHost === origHost || navHost.endsWith('.' + origHost)) return false;

    // Allow whitelisted CDNs
    if (ALLOWED_CDN.some(cdn => navHost === cdn || navHost.endsWith('.' + cdn))) return false;

    // Block everything else (anti-redirect)
    return true;
  } catch {
    return false;
  }
}

module.exports = { isBlocked, isBlockedNavigation };
