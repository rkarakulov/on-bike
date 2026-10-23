// Service worker web-сборки: только кеш статики сборки (без офлайн-данных). Чистые функции —
// генератор scripts/build-service-worker.ts и тесты.
import { createHash } from 'node:crypto';

/**
 * Хешированная статика сборки: имя файла меняется с содержимым — безопасно отдавать из кеша.
 * `/_expo/static/**` — бандлы и стили (`имя-<md5>.js|css`), `/assets/**` — ассеты из кода (`имя.<md5>[@2x].ext`).
 * Мимо: HTML (SSR), `/_expo/loaders` (данные), API, manifest, `public/` без хеша в имени, source maps.
 */
const HASHED = [
  /^\/_expo\/static\/.+-[0-9a-f]{32}\.(?:js|css)$/,
  /^\/assets\/.+\.[0-9a-f]{32}(?:@\d+(?:\.\d+)?x)?\.\w+$/,
];

/** Картинки служебных экранов expo-router (sitemap, unmatched, error…) — не для пользователя, не в precache. */
const EXPO_ROUTER_SCREENS = /^\/assets\/__node_modules\/expo-router\/assets\/[^/]+$/;

/** URL-пути файлов `dist/client`, которые попадают в precache, — отсортированы (стабильная версия). */
export function precacheList(paths: readonly string[]): string[] {
  return paths
    .filter((path) => HASHED.some((re) => re.test(path)) && !EXPO_ROUTER_SCREENS.test(path))
    .sort();
}

/** Файл precache: URL-путь и содержимое (для версии кеша). */
export type PrecacheFile = { path: string; content: string | Uint8Array };

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

/**
 * Версия кеша — от содержимого: хеш строк `путь + sha256(файла)`. Изменился любой файл (даже с тем же именем,
 * как в dev-сборке) — новый кеш, старый удаляется при activate.
 */
export function cacheVersion(files: readonly PrecacheFile[]): string {
  const lines = files.map(({ path, content }) => `${path} ${sha256(content)}`);
  return sha256(lines.join('\n')).slice(0, 12);
}

const CACHE_PREFIX = 'static-';

/** Текст `sw.js`: install — precache, activate — удаление прошлых версий, fetch — cache-first по списку. */
export function serviceWorkerSource(files: readonly PrecacheFile[]): string {
  const cache = `${CACHE_PREFIX}${cacheVersion(files)}`;
  return `// сгенерирован scripts/build-service-worker.ts — не править
const CACHE = ${JSON.stringify(cache)};
const FILES = new Set(${JSON.stringify(files.map(({ path }) => path))});

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...FILES])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(${JSON.stringify(CACHE_PREFIX)}) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// только GET своей статики из списка; HTML, данные и API — сеть, как без service worker
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!FILES.has(url.pathname)) return;
  event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request)));
});
`;
}
