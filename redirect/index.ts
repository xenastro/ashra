/**
 * ashra.aburaddad.com moved to ashra.radrek.com on 2026-10-17. Every request goes to the same
 * path there, except /sw.js: phones that opened the old address run its service worker, which
 * serves the app from cache and never sees a redirect. When the browser checks that worker for
 * an update it gets this one instead, which clears the caches, removes itself and reloads the
 * page, so the reload lands on the redirect.
 */
const TARGET = 'https://ashra.radrek.com';

const RETIRE_SW = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
`;

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (url.pathname === '/sw.js') {
      return new Response(RETIRE_SW, {
        headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
    return Response.redirect(TARGET + url.pathname + url.search, 301);
  },
};
