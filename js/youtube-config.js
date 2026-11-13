/**
 * YouTube Data API v3 — public browser key.
 * Configure a Google Cloud key restricted to your website HTTP referrers
 * AND to YouTube Data API v3. Browser-side API keys are never secret.
 *
 * Restrict referrers to https://thedocrot.creatorpromote.com/*
 * and/or your actual published domain. For testing, add localhost as needed.
 */
window.DOCROT_YOUTUBE = {
  apiKey: 'AIzaSyBvpCwNhDR-PvJ02tJ2iJDekFc3R9-g5V0',
  channelHandle: '@thedocrot',
  // Client-side cache, per visitor. Adjust if your site's daily visitors grow.
  cacheMinutes: 45,
  latestCount: 6,
  replayCount: 6,
  checkLive: true
};
