// 배포 파일을 수정하면 캐시 버전을 올려주세요.
const CACHE_PREFIX = 'my-todo-pwa-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;

const APP_URL = new URL(
  './index.html',
  self.registration.scope
).href;

const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
].map(path => new URL(path, self.registration.scope).href);

// 설치할 때 앱 실행에 필요한 파일을 저장합니다.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// 새 버전이 활성화되면 이전 앱 캐시를 삭제합니다.
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();

    await Promise.all(
      names
        .filter(name =>
          name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
        )
        .map(name => caches.delete(name))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  const isAppNavigation =
    request.mode === 'navigate' &&
    (
      url.pathname === new URL(APP_URL).pathname ||
      url.pathname === new URL(self.registration.scope).pathname
    );

  // 온라인에서는 서버의 페이지를, 오프라인에서는 캐시를 사용합니다.
  if (isAppNavigation) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (!response.ok) {
          throw new Error('페이지 요청 실패');
        }

        return response;
      } catch {
        return (await caches.match(APP_URL)) || Response.error();
      }
    })());

    return;
  }

  // 앱의 정적 파일은 캐시를 우선 사용합니다.
  if (ASSETS.includes(url.href)) {
    event.respondWith((async () => {
      return (await caches.match(request)) || fetch(request);
    })());
  }
});
