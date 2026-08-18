const CACHE_NAME = "lifetop-v4-cache";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/01-base.css",
  "./css/02-background.css",
  "./css/03-glass.css",
  "./css/04-header.css",
  "./css/05-hero-search.css",
  "./css/06-notice.css",
  "./css/07-layout.css",
  "./css/08-bookmark.css",
  "./css/09-todo-memo.css",
  "./css/10-settings.css",
  "./css/11-animations.css",
  "./css/15-weather-detail.css",
  "./js/main.js",
  "./js/config.js",
  "./js/storage.js",
  "./js/settings.js",
  "./js/clock.js",
  "./js/search.js",
  "./js/bookmarks.js",
  "./js/todo.js",
  "./js/weather.js",
  "./js/styles.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// インストール時に静的キャッシュを作成
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// アクティベート時に古いキャッシュをクリーンアップ
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ処理でのネットワークファースト（またはキャッシュ優先のフォールバック）
self.addEventListener("fetch", event => {
  // http / https 以外のスキーム（chrome-extension://など）は対象外にする
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // 外部APIや動的アセット（天気情報やUnsplash画像、Favicon）はキャッシュしない
  if (
    event.request.url.includes("api.open-meteo.com") || 
    event.request.url.includes("images.unsplash.com") || 
    event.request.url.includes("a.favicon.im")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // オフライン時のエラーハンドリング
      });
    })
  );
});