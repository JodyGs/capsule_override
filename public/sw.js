/* Service worker — l'app entiere disponible hors ligne.
   Tous les chemins sont relatifs : l'app marche a la racine d'un domaine
   comme dans un sous-dossier (GitHub Pages, par exemple). */

const VERSION = "capsule-v4";
const CACHE = `${VERSION}-shell`;

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./sprites.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll echoue en bloc des qu'un fichier manque : on tolere les absents.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

const putInCache = (request, response) => {
  if (response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // polices Google : laisser passer

  // Navigation : reseau d'abord pour attraper les mises a jour, coquille en secours.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => putInCache(request, res))
        .catch(() => caches.match("./index.html") || caches.match("./"))
    );
    return;
  }

  // Le catalogue de la saison change au fil des patchs : reseau d'abord.
  if (url.pathname.endsWith("/sprites.json")) {
    event.respondWith(
      fetch(request)
        .then((res) => putInCache(request, res))
        .catch(() => caches.match(request))
    );
    return;
  }

  // Le reste : cache d'abord, rafraichi en arriere-plan.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((res) => putInCache(request, res))
        .catch(() => hit);
      return hit || network;
    })
  );
});
