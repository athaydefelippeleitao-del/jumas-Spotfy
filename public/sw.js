// JUMAS Cancioneiro - Service Worker v2 (Offline Support)
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `jumas-static-${CACHE_VERSION}`;
const API_CACHE = `jumas-api-${CACHE_VERSION}`;

// Assets estáticos para cache no install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.png',
];

// APIs que devem ser cacheadas para uso offline (somente GET)
const CACHEABLE_APIS = [
  '/api/songs',
  '/api/songbooks',
  '/api/artists',
  '/api/academy',
  '/api/settings/loading-image',
  '/api/settings/app-icon',
];

// ─── Install: pré-cache de assets estáticos ───────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Falha ao pré-cachear assets:', err);
      })
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate: limpar caches antigos ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: estratégia inteligente por tipo de request ────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests que não sejam GET
  if (request.method !== 'GET') return;

  // Ignorar requests para outras origens (ex: Supabase Storage)
  if (url.origin !== self.location.origin) return;

  const isCacheableApi = CACHEABLE_APIS.some((api) => url.pathname.startsWith(api));
  const isStaticAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/) ||
    url.pathname === '/' ||
    url.pathname === '/index.html';

  if (isCacheableApi) {
    // API: Network-first com fallback para cache
    event.respondWith(networkFirstApi(request));
  } else if (isStaticAsset) {
    // Assets estáticos: Cache-first
    event.respondWith(cacheFirstStatic(request));
  } else {
    // Qualquer outra coisa: Network-first com fallback para index.html (SPA routing)
    event.respondWith(networkWithSpaFallback(request));
  }
});

// ─── Estratégia: Network-first para APIs ─────────────────────────────────
async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Salvar resposta no cache (clone porque o body só pode ser lido uma vez)
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Offline: retornar do cache
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Offline - servindo do cache:', request.url);
      return cached;
    }
    // Sem cache: retornar erro amigável em JSON
    return new Response(
      JSON.stringify({ error: 'Sem conexão e sem dados em cache', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' },
      }
    );
  }
}

// ─── Estratégia: Cache-first para assets ─────────────────────────────────
async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Se falhar e for navegação, retornar index.html do cache
    if (request.mode === 'navigate') {
      const indexCache = await cache.match('/index.html');
      if (indexCache) return indexCache;
    }
    return new Response('Offline', { status: 503 });
  }
}

// ─── Estratégia: Network com fallback SPA ────────────────────────────────
async function networkWithSpaFallback(request) {
  try {
    return await fetch(request);
  } catch (err) {
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      const indexCache = await cache.match('/index.html');
      if (indexCache) return indexCache;
    }
    return new Response('Offline', { status: 503 });
  }
}

// ─── Mensagem: forçar atualização do SW ──────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
