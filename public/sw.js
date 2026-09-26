/* Service worker — l'app entiere disponible hors ligne.
   Tous les chemins sont relatifs : l'app marche a la racine d'un domaine
   comme dans un sous-dossier (GitHub Pages, par exemple). */

const VERSION = "capsule-v38";
const CACHE = `${VERSION}-shell`;

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./sprites.json",
  "./sprites-legacy.json",
  "./cheat-codes.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-180.png",

  // Icones des esprits : indispensables pour que la liste reste lisible hors ligne.
  "./icons/sprites/jonesy.png",
  "./icons/sprites/bush.png",
  "./icons/sprites/adventure.png",
  "./icons/sprites/8bit.png",
  "./icons/sprites/sonic.png",
  "./icons/sprites/tails.png",
  "./icons/sprites/shadow.png",
  "./icons/sprites/killswitch.png",
  "./icons/sprites/jackrabbit.png",
  "./icons/sprites/klombo.png",
  "./icons/sprites/crown.png",
  "./icons/sprites/stormscout.png",
  "./icons/sprites/xray.png",
  "./icons/sprites/onigiri.png",
  "./icons/sprites/overshield.png",
  "./icons/sprites/megaman.png",
  "./icons/sprites/crash.png",
  "./icons/sprites/blinky.png",
  "./icons/sprites/morgana.png",
  "./icons/sprites/birthday.png",
  "./icons/sprites/jody.png",
  "./icons/sprites/pond.png",
  "./icons/sprites/l-earth.png",
  "./icons/sprites/l-fire.png",
  "./icons/sprites/l-water.png",
  "./icons/sprites/l-fishy.png",
  "./icons/sprites/l-air.png",
  "./icons/sprites/l-duck.png",
  "./icons/sprites/l-ghost.png",
  "./icons/sprites/l-demon.png",
  "./icons/sprites/l-king.png",
  "./icons/sprites/l-striker.png",
  "./icons/sprites/l-aura.png",
  "./icons/sprites/l-dream.png",
  "./icons/sprites/l-punk.png",
  "./icons/sprites/l-boss.png",
  "./icons/sprites/l-seven.png",
  "./icons/sprites/l-llama.png",
  "./icons/sprites/l-peely.png",
  "./icons/sprites/l-zeropoint.png",
  "./icons/sprites/l-grim.png",
  "./icons/sprites/l-vinijr.png",
  "./icons/sprites/l-batman.png",
  "./icons/sprites/l-pollo.png",
  "./icons/sprites/l-ironmouse.png",
  "./icons/sprites/l-johnwick.png",

  // Vignettes des variantes de la saison en cours. Celles des saisons
  // passees ne sont pas prechargees : le gestionnaire fetch les met en
  // cache a la premiere consultation, ce qui evite 92 fichiers a
  // l'installation pour une collection qu'on ne consulte qu'a l'occasion.
  "./icons/variants/jonesy-gold.png",
  "./icons/variants/jonesy-cheat.png",
  "./icons/variants/bush-gold.png",
  "./icons/variants/bush-cheat.png",
  "./icons/variants/adventure-gold.png",
  "./icons/variants/adventure-cheat.png",
  "./icons/variants/8bit-gold.png",
  "./icons/variants/8bit-cheat.png",
  "./icons/variants/sonic-gold.png",
  "./icons/variants/sonic-cheat.png",
  "./icons/variants/tails-gold.png",
  "./icons/variants/tails-cheat.png",
  "./icons/variants/shadow-gold.png",
  "./icons/variants/shadow-cheat.png",
  "./icons/variants/killswitch-gold.png",
  "./icons/variants/killswitch-cheat.png",
  "./icons/variants/jackrabbit-gold.png",
  "./icons/variants/jackrabbit-cheat.png",
  "./icons/variants/klombo-gold.png",
  "./icons/variants/klombo-cheat.png",
  "./icons/variants/crown-gold.png",
  "./icons/variants/crown-cheat.png",
  "./icons/variants/stormscout-gold.png",
  "./icons/variants/stormscout-cheat.png",
  "./icons/variants/crown-loot.png",
  "./icons/variants/xray-gold.png",
  "./icons/variants/xray-cheat.png",
  "./icons/variants/onigiri-gold.png",
  "./icons/variants/onigiri-cheat.png",
  "./icons/variants/overshield-gold.png",
  "./icons/variants/overshield-cheat.png",
  "./icons/variants/jonesy-loot.png",
  "./icons/variants/bush-loot.png",
  "./icons/variants/adventure-loot.png",
  "./icons/variants/8bit-loot.png",
  "./icons/variants/sonic-loot.png",
  "./icons/variants/tails-loot.png",
  "./icons/variants/shadow-loot.png",
  "./icons/variants/killswitch-loot.png",
  "./icons/variants/jackrabbit-loot.png",
  "./icons/variants/klombo-loot.png",
  "./icons/variants/stormscout-loot.png",
  "./icons/variants/xray-loot.png",
  "./icons/variants/crash-gold.png",
  "./icons/variants/crash-cheat.png",
  "./icons/variants/crash-loot.png",
  "./icons/variants/blinky-gold.png",
  "./icons/variants/blinky-cheat.png",
  "./icons/variants/blinky-loot.png",
  "./icons/variants/pond-gold.png",
  "./icons/variants/pond-cheat.png",
  "./icons/variants/pond-loot.png",
  "./icons/variants/jonesy-bounty.png",
  "./icons/variants/bush-bounty.png",
  "./icons/variants/adventure-bounty.png",
  "./icons/variants/8bit-bounty.png",
  "./icons/variants/sonic-bounty.png",
  "./icons/variants/tails-bounty.png",
  "./icons/variants/shadow-bounty.png",
  "./icons/variants/killswitch-bounty.png",
  "./icons/variants/jackrabbit-bounty.png",
  "./icons/variants/klombo-bounty.png",
  "./icons/variants/crown-bounty.png",
  "./icons/variants/stormscout-bounty.png",
  "./icons/variants/xray-bounty.png",
  "./icons/variants/onigiri-bounty.png",
  "./icons/variants/overshield-bounty.png",
  "./icons/variants/crash-bounty.png",
  "./icons/variants/blinky-bounty.png",
  "./icons/variants/pond-bounty.png",
  "./icons/variants/morgana-gold.png",
  "./icons/variants/morgana-cheat.png",
  "./icons/variants/morgana-loot.png",
  "./icons/variants/morgana-bounty.png",
  "./icons/variants/birthday-gold.png",
  "./icons/variants/birthday-cheat.png",
  "./icons/variants/birthday-loot.png",
  "./icons/variants/birthday-bounty.png",
  "./icons/variants/jody-gold.png",
  "./icons/variants/jody-cheat.png",
  "./icons/variants/jody-loot.png",
  "./icons/variants/jody-bounty.png",
  "./icons/variants/onigiri-loot.png",
  "./icons/variants/overshield-loot.png"
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
  if (/\/(sprites(-legacy)?|cheat-codes)\.json$/.test(url.pathname)) {
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
