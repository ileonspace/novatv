/* NovaTV Service Worker - PWA 离线缓存
 * 运行时缓存策略（静态资源带 hash 自动版本化，无需每次 build 更新本文件）：
 *  - _next/static、icons、manifest：cache-first（缓存 miss 时请求并写入）
 *  - 导航请求（页面）：network-first，离线 fallback 缓存
 *  - API 请求（/api/*）：不缓存，保证数据实时
 */
const CACHE = 'novatv-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // API 请求不缓存（实时数据）
  if (url.pathname.startsWith('/api/')) return;

  // 静态资源（带 hash 版本化）：cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
    return;
  }

  // 导航请求（页面）：network-first，成功后写入缓存，离线 fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((c) => c || caches.match('/'))
        )
    );
  }
});
