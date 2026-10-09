/* Demarre app.js dans un DOM sans navigateur : linkedom pour le document, des
   bouchons pour ce que l'app touche au demarrage. Pas de navigateur a
   installer, pas de serveur a lancer. */
import { parseHTML } from "linkedom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
export const lire = (f) => JSON.parse(readFileSync(join(PUB, f), "utf8"));

export async function boot({ store = {}, mutate = null, at = null } = {}) {
  // Le compte a rebours depend de l'heure : on la fige avant de demarrer.
  if (at !== null) Date.now = () => at;
  const { window, document } = parseHTML(
    `<!doctype html><html><body>${readFileSync(join(PUB, "index.html"), "utf8")}</body></html>`);
  const memory = { ...store };
  const localStorage = {
    getItem: (k) => (k in memory ? memory[k] : null),
    setItem: (k, v) => { memory[k] = String(v); },
    removeItem: (k) => { delete memory[k]; },
  };
  const opened = [];
  for (const d of document.querySelectorAll("dialog")) {
    d.showModal = function () { opened.push(this.id); this.open = true; };
    d.close = function () { this.open = false; };
  }
  const season = lire("sprites.json");
  if (mutate) mutate(season);
  const files = {
    "sprites.json": season,
    "sprites-legacy.json": lire("sprites-legacy.json"),
    "sprites-family.json": lire("sprites-family.json"),
    "cheat-codes.json": lire("cheat-codes.json"),
  };
  const g = globalThis;
  const def = (k, v) => Object.defineProperty(g, k, { value: v, configurable: true, writable: true });
  def("window", window); def("document", document); def("localStorage", localStorage);
  def("fetch", async (url) => {
    const n = String(url).split("/").pop().split("?")[0];
    if (!(n in files)) throw new Error(`fichier inattendu ${n}`);
    return { ok: true, json: async () => files[n] };
  });
  def("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Object.defineProperty(g, "navigator", { value: { serviceWorker: undefined, storage: undefined }, configurable: true });
  window.matchMedia = g.matchMedia; window.localStorage = localStorage;
  window.requestAnimationFrame = (fn) => fn();
  def("requestAnimationFrame", window.requestAnimationFrame);
  def("Image", class { set src(_) {} });
  // Le nonce force une reevaluation : sans lui, le module serait mis en cache
  // et le second demarrage reprendrait l'etat du premier.
  const src = readFileSync(join(PUB, "app.js"), "utf8");
  await import("data:text/javascript," + encodeURIComponent(
    `${src}\n// ${Math.random()}\nglobalThis.__peek = { state, applyFilters, matches };`));
  await new Promise((r) => setTimeout(r, 40));

  const click = (el) => el.dispatchEvent(new window.Event("click", { bubbles: true }));
  const setFilter = (s) => click(document.querySelector(`#status-seg [data-status="${s}"]`));
  const setRarity = (id) => click(document.querySelector(`#rarity-chips [data-rarity="${id}"]`));
  const visibleCards = () => [...document.querySelectorAll("#grid .card")].filter((c) => c.style.display !== "none");
  const visibleRows = (card) => [...card.querySelectorAll(".vrow")].filter((r) => !r.hidden);
  const openTodo = () => { click(document.getElementById("btn-todo")); return document.getElementById("todo-list"); };
  return { document, window, memory, opened, peek: g.__peek, click, setFilter, setRarity,
           visibleCards, visibleRows, openTodo };
}

/* Un compteur commun a tous les fichiers : chacun s'acheve sur son total. */
export function compteur() {
  let pass = 0, fail = 0;
  const ok = (c, l) => { if (c) pass += 1; else { fail += 1; console.log("  FAIL", l); } };
  const eq = (a, b, l) => ok(a === b, `${l} — attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`);
  const fin = () => {
    console.log(`${pass} verifications passees, ${fail} echouees`);
    process.exit(fail ? 1 : 0);
  };
  return { ok, eq, fin };
}
