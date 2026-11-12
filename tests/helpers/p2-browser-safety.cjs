'use strict';
const base = require('@playwright/test');
const fs = require('node:fs');
// Optional local cache contains only the public CDN scripts already used by the app.
const cache = process.env.HELFERLEIN_STATIC_CACHE
  ? JSON.parse(fs.readFileSync(process.env.HELFERLEIN_STATIC_CACHE, 'utf8')) : {};
const staticHosts = new Set(['cdn.tailwindcss.com', 'unpkg.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com']);
const test = base.test.extend({
  context: async ({context}, use) => {
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      const cached = cache[request.url()] || cache[request.url().replace(/\/$/, '')];
      if (cached) return route.fulfill({path: cached, contentType: 'text/javascript'});
      if (url.origin === 'http://127.0.0.1:8765' && request.method() === 'GET') return route.continue();
      if (!process.env.HELFERLEIN_STATIC_CACHE && staticHosts.has(url.hostname) && request.method() === 'GET') return route.continue();
      return route.abort(); // No production APIs, auth, analytics, uploads or writes.
    });
    await use(context);
  }
});
module.exports = {test, expect: base.expect};
