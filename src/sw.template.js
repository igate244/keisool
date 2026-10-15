// ビルド時にキャッシュ名とプリキャッシュ一覧が埋め込まれる（build.mjs）
const CACHE = 'keisool-__VERSION__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('keisool-') && k !== CACHE && k !== 'keisool-sdk').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Firebase の SDK（gstatic）は一度読んだらキャッシュして、オフラインでも起動できるようにする
  if (url.host === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(
      caches.open('keisool-sdk').then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => (res.ok && c.put(req, res.clone()), res))),
      ),
    );
    return;
  }
  if (url.origin !== location.origin) return; // Firebase の通信などはそのままネットへ

  // 画面遷移：ネット優先（新しい版をすぐ反映）、オフライン時はキャッシュ
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  // それ以外（ハッシュ付きJS/CSS・アイコン）：キャッシュ優先
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
