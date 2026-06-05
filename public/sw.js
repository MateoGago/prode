const STATIC_CACHE = "prodebates-static-v1";
const STATIC_ASSET_PATTERN =
  /\.(?:css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;
  if (
    url.pathname === "/login" ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/predicciones")
  ) {
    return;
  }
  if (request.mode === "navigate") return;
  if (
    !url.pathname.startsWith("/_next/static/") &&
    !STATIC_ASSET_PATTERN.test(url.pathname)
  ) {
    return;
  }

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);

      if (response.ok && response.type === "basic") {
        await cache.put(request, response.clone());
      }

      return response;
    }),
  );
});
