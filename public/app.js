/* ============================================================
   Capsule Override — tout se passe sur l'appareil
   Aucun serveur, aucun compte : les coches vivent dans le
   stockage local du navigateur et survivent a la fermeture.
   ============================================================ */

const $ = (id) => document.getElementById(id);

const K_STORE = "capsule-override.store.v4";
const K_THEME = "capsule-override.theme";
// Sauvegardes laissees par les versions precedentes de l'app.
const K_LEGACY_PROFILES = ["capsule-override.store.v3", "capsule-override.store.v2"];
const K_LEGACY_ACTIVE = "capsule-override.active";
const K_LEGACY_FLAT = "capsule-override.v1";

const ICON_U = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>';
const ICON_M = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8.5 7.5 11 12 4l4.5 7L21 8.5l-1.8 9.5H4.8L3 8.5Z"/></svg>';

const state = {
  catalogue: null,
  live: [],
  denom: 0,
  entries: {},
  filters: { q: "", rarity: "all", status: "all", view: "cards" }
};

const cards = new Map();
const now = () => Date.now();

/* ============================================================
   Theme : systeme, clair ou sombre
   ============================================================ */
const THEMES = [
  { id: "auto",  label: "Auto",   note: "L'app suit le reglage clair ou sombre de votre telephone." },
  { id: "light", label: "Clair",  note: "L'app reste claire, quel que soit le reglage du telephone." },
  { id: "dark",  label: "Sombre", note: "L'app reste sombre, quel que soit le reglage du telephone." }
];

const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.7 8.7 0 1 0 11.1 11.1Z"/></svg>';
const AUTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.4"/><path d="M12 3.6v16.8" /><path d="M12 3.6a8.4 8.4 0 0 1 0 16.8Z" fill="currentColor" stroke="none"/></svg>';

let theme = "auto";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

const resolvedDark = () => theme === "dark" || (theme === "auto" && darkQuery.matches);

function applyTheme(next, { persist = true } = {}) {
  theme = THEMES.some((t) => t.id === next) ? next : "auto";

  if (theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);

  // La barre d'etat du telephone doit suivre, sinon elle jure en mode installe.
  const meta = $("theme-color");
  if (meta) meta.content = resolvedDark() ? "#0F0C16" : "#F1EFF6";

  if (persist) {
    try { localStorage.setItem(K_THEME, theme); } catch { /* stockage bloque */ }
  }

  const current = THEMES.find((t) => t.id === theme);
  $("theme-label").textContent = current.label;
  $("theme-icon").innerHTML = theme === "auto" ? AUTO : theme === "dark" ? MOON : SUN;
  $("btn-theme").setAttribute("aria-label", `Theme : ${current.label}. Changer.`);
  $("btn-theme").title = current.note;

  for (const b of $("theme-seg").querySelectorAll("button")) {
    b.setAttribute("aria-pressed", String(b.dataset.theme === theme));
  }
  $("theme-note").textContent = current.note;
}

// Le bouton de la barre fait defiler les trois modes.
$("btn-theme").addEventListener("click", () => {
  const i = THEMES.findIndex((t) => t.id === theme);
  applyTheme(THEMES[(i + 1) % THEMES.length].id);
});

$("theme-seg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) applyTheme(b.dataset.theme);
});

// En mode Auto, suivre le telephone s'il bascule en cours de route.
darkQuery.addEventListener("change", () => {
  if (theme === "auto") applyTheme("auto", { persist: false });
});

/* ============================================================
   Stockage
   ============================================================ */
function readStore() {
  try {
    const raw = localStorage.getItem(K_STORE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.entries === "object") return parsed.entries || {};
    }

    // Versions a profils multiples : on reprend celui qui etait ouvert.
    for (const key of K_LEGACY_PROFILES) {
      const old = localStorage.getItem(key);
      if (!old) continue;
      const parsed = JSON.parse(old);
      const profiles = (parsed?.profiles || []).filter((p) => p && !p.deleted);
      if (!profiles.length) continue;
      const activeId = localStorage.getItem(K_LEGACY_ACTIVE);
      const chosen = profiles.find((p) => p.id === activeId) || profiles[0];
      return chosen.data || {};
    }

    // Toute premiere version : les coches etaient stockees a plat.
    const flat = localStorage.getItem(K_LEGACY_FLAT);
    if (flat) {
      const parsed = JSON.parse(flat);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch { /* stockage illisible : on repart proprement */ }
  return {};
}

let saveTimer = null;
function saveStore({ immediate = false } = {}) {
  const write = () => {
    try {
      localStorage.setItem(K_STORE, JSON.stringify({ v: 4, updatedAt: now(), entries: state.entries }));
      flashSaved();
    } catch {
      setSync("warn", "Stockage plein");
    }
  };
  clearTimeout(saveTimer);
  if (immediate) write();
  else saveTimer = setTimeout(write, 250);
}

const statusOf = (spriteId, variant) => state.entries?.[spriteId]?.[variant] || 0;

function setStatus(spriteId, variant, value) {
  const slot = (state.entries[spriteId] ||= {});
  if (value) slot[variant] = value;
  else delete slot[variant];
  if (!Object.keys(slot).length) delete state.entries[spriteId];
  saveStore();
}

/* Demande au navigateur de ne pas evincer nos donnees si la place manque. */
async function requestPersistence() {
  if (!navigator.storage?.persist) return null;
  try {
    return (await navigator.storage.persisted?.()) || (await navigator.storage.persist());
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   Indicateur d'enregistrement
   ------------------------------------------------------------ */
let storageLabel = "Sur cet appareil";
let flashTimer = null;

function setSync(kind, label) {
  $("sync").dataset.state = kind;
  $("sync-label").textContent = label;
}

function flashSaved() {
  setSync("saving", "Enregistre");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => setSync("live", storageLabel), 1200);
}

/* ============================================================
   Catalogue
   ============================================================ */
const esc = (str) => String(str).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const rarityToken = (id) => ({
  rare: "--r-rare", epic: "--r-epic", legendary: "--r-legendary",
  mythic: "--r-mythic", unknown: "--ink-3"
})[id] || "--ink-3";

const rarityLabel = (id) =>
  state.catalogue.rarities.find((r) => r.id === id)?.label || id;

function buildCards() {
  const grid = $("grid");
  grid.innerHTML = "";
  cards.clear();

  for (const sprite of state.catalogue.sprites) {
    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--rc", `var(${rarityToken(sprite.rarity)})`);

    let tags = `<span class="tag rarity">${rarityLabel(sprite.rarity)}</span>`;
    if (!sprite.released) tags += '<span class="tag soon">A venir</span>';

    const rows = state.catalogue.variants.map((v) => `
      <div class="vrow ${v.id === "gold" ? "v-gold" : v.id === "cheat" ? "v-cheat" : ""}">
        <span class="vname"><i></i>${esc(v.name)}</span>
        <button type="button" class="tog t-u" data-s="${sprite.id}" data-v="${v.id}" data-lvl="1"
                aria-pressed="false" aria-label="${esc(sprite.name)} ${esc(v.name)} debloque" title="Debloque">${ICON_U}</button>
        <button type="button" class="tog t-m" data-s="${sprite.id}" data-v="${v.id}" data-lvl="2"
                aria-pressed="false" aria-label="${esc(sprite.name)} ${esc(v.name)} maitrise" title="Maitrise — extrait au niveau 5">${ICON_M}</button>
      </div>`).join("");

    card.innerHTML = `
      <div class="card-top">
        <h2 class="name">${esc(sprite.name)}<em>${esc(sprite.sub)}</em></h2>
        <div class="tags">${tags}</div>
      </div>
      <p class="effect">${esc(sprite.effect)}${sprite.unconfirmed ? ' <span class="unconf">(effet non confirme)</span>' : ""}</p>
      <div class="src"><b>Source</b><span>${esc(sprite.source)}</span></div>
      <div class="vt">
        <div class="vt-head"><span>Variante</span><span>Deb.</span><span>Mai.</span></div>
        ${rows}
      </div>`;

    cards.set(sprite.id, card);
    grid.appendChild(card);
  }
}

function paintCard(sprite) {
  const card = cards.get(sprite.id);
  let mastered = 0;

  for (const btn of card.querySelectorAll(".tog")) {
    const level = Number(btn.dataset.lvl);
    btn.setAttribute("aria-pressed", statusOf(btn.dataset.s, btn.dataset.v) >= level ? "true" : "false");
  }
  for (const v of state.catalogue.variants) {
    if (statusOf(sprite.id, v.id) === 2) mastered += 1;
  }

  const done = mastered === state.catalogue.variants.length;
  card.classList.toggle("is-done", done);

  const tags = card.querySelector(".tags");
  const doneTag = tags.querySelector(".tag.done");
  if (done && !doneTag) {
    const t = document.createElement("span");
    t.className = "tag done";
    t.textContent = "Complet";
    tags.appendChild(t);
  } else if (!done && doneTag) {
    doneTag.remove();
  }
}

/* ------------------------------------------------------------
   Coches
   ------------------------------------------------------------ */
$("grid").addEventListener("click", (e) => {
  const btn = e.target.closest(".tog");
  if (!btn) return;

  const { s: spriteId, v: variant } = btn.dataset;
  const level = Number(btn.dataset.lvl);
  const current = statusOf(spriteId, variant);
  // Debloque : bascule. Maitrise : implique debloque, et le retirer laisse debloque.
  const next = level === 1 ? (current >= 1 ? 0 : 1) : (current === 2 ? 1 : 2);

  setStatus(spriteId, variant, next);
  paintCard(state.catalogue.sprites.find((x) => x.id === spriteId));
  renderStats();

  if (next > current) {
    btn.classList.remove("pulse");
    void btn.offsetWidth;
    btn.classList.add("pulse");
    if (navigator.vibrate) navigator.vibrate(next === 2 ? [12, 40, 18] : 12);
  }
  if (state.filters.status !== "all") applyFilters();
});

/* ------------------------------------------------------------
   Scores
   ------------------------------------------------------------ */
function renderStats() {
  let unlocked = 0, mastered = 0, full = 0;
  for (const sprite of state.live) {
    let done = 0;
    for (const v of state.catalogue.variants) {
      const value = statusOf(sprite.id, v.id);
      if (value >= 1) unlocked += 1;
      if (value === 2) { mastered += 1; done += 1; }
    }
    if (done === state.catalogue.variants.length) full += 1;
  }

  const denom = state.denom;
  $("s-unlocked").firstChild.nodeValue = unlocked;
  $("s-mastered").firstChild.nodeValue = mastered;
  $("s-pct").firstChild.nodeValue = denom ? Math.round((mastered / denom) * 100) : 0;
  $("s-full").firstChild.nodeValue = full;
  $("bar-m").style.width = `${(mastered / denom) * 100}%`;
  $("bar-u").style.width = `${((unlocked - mastered) / denom) * 100}%`;

  for (const rarity of ["rare", "epic", "legendary", "mythic"]) {
    const subset = state.live.filter((s) => s.rarity === rarity);
    const d = subset.length * state.catalogue.variants.length;
    let ru = 0, rm = 0;
    for (const sprite of subset) {
      for (const v of state.catalogue.variants) {
        const value = statusOf(sprite.id, v.id);
        if (value >= 1) ru += 1;
        if (value === 2) rm += 1;
      }
    }
    const line = $(`rr-${rarity}`);
    if (!line) continue;
    line.textContent = `${rm} / ${d} maitrises`;
    const track = line.nextElementSibling;
    track.querySelector(".m").style.width = d ? `${(rm / d) * 100}%` : "0%";
    track.querySelector(".u").style.width = d ? `${((ru - rm) / d) * 100}%` : "0%";
  }
}

function buildRarityPanel() {
  const box = $("by-rarity");
  box.innerHTML = "";
  for (const rarity of ["rare", "epic", "legendary", "mythic"]) {
    const el = document.createElement("div");
    el.className = "rr";
    el.innerHTML = `
      <span class="rr-k"><i class="rr-dot" style="background:var(${rarityToken(rarity)})"></i>${rarityLabel(rarity)}</span>
      <span class="rr-v" id="rr-${rarity}">0 / 0</span>
      <span class="rr-track"><i class="m" style="width:0%;background:var(--gold)"></i><i class="u" style="width:0%;background:var(--accent)"></i></span>`;
    box.appendChild(el);
  }
}

/* ============================================================
   Filtres
   ============================================================ */
const STATUS = [
  { id: "all", label: "Tout" },
  { id: "missing", label: "Manquants" },
  { id: "unlocked", label: "Debloques" },
  { id: "mastered", label: "Maitrises" },
  { id: "soon", label: "A venir" }
];

function buildFilters() {
  const seg = $("status-seg");
  seg.innerHTML = "";
  for (const st of STATUS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = st.label;
    b.dataset.status = st.id;
    b.setAttribute("aria-pressed", String(st.id === "all"));
    seg.appendChild(b);
  }

  const chips = $("rarity-chips");
  chips.innerHTML = "";
  const options = [{ id: "all", label: "Toutes" },
    ...state.catalogue.rarities.filter((r) => r.id !== "unknown")];
  for (const r of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.rarity = r.id;
    b.setAttribute("aria-pressed", String(r.id === "all"));
    b.innerHTML = (r.id === "all" ? "" : `<i class="dot" style="background:var(${rarityToken(r.id)})"></i>`) + r.label;
    chips.appendChild(b);
  }
}

$("status-seg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  state.filters.status = b.dataset.status;
  for (const x of e.currentTarget.querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b));
  applyFilters();
});

$("rarity-chips").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (!b) return;
  state.filters.rarity = b.dataset.rarity;
  for (const x of e.currentTarget.querySelectorAll(".chip")) x.setAttribute("aria-pressed", String(x === b));
  applyFilters();
});

$("view-seg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  state.filters.view = b.dataset.view;
  for (const x of e.currentTarget.querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b));
  $("grid").classList.toggle("is-list", state.filters.view === "list");
});

$("q").addEventListener("input", (e) => {
  state.filters.q = e.target.value.trim().toLowerCase();
  applyFilters();
});

function matches(sprite) {
  const f = state.filters;
  if (f.rarity !== "all" && sprite.rarity !== f.rarity) return false;

  const values = state.catalogue.variants.map((v) => statusOf(sprite.id, v.id));
  if (f.status === "missing" && !values.some((v) => v < 2)) return false;
  if (f.status === "unlocked" && !values.some((v) => v >= 1)) return false;
  if (f.status === "mastered" && !values.every((v) => v === 2)) return false;
  if (f.status === "soon" && sprite.released) return false;

  if (f.q) {
    const hay = `${sprite.name} ${sprite.sub} ${sprite.effect} ${sprite.source} ${rarityLabel(sprite.rarity)}`.toLowerCase();
    if (!hay.includes(f.q)) return false;
  }
  return true;
}

function applyFilters() {
  let shown = 0;
  for (const sprite of state.catalogue.sprites) {
    const ok = matches(sprite);
    cards.get(sprite.id).style.display = ok ? "" : "none";
    if (ok) shown += 1;
  }
  $("empty").hidden = shown > 0;
  $("count").textContent =
    `${shown} ${shown > 1 ? "esprits affiches" : "esprit affiche"} · ` +
    `${state.catalogue.sprites.length} au total cette saison`;
}

/* ============================================================
   Sauvegarde manuelle : transferer vers un autre telephone
   ============================================================ */
$("btn-export").addEventListener("click", async () => {
  const text = JSON.stringify({
    app: "capsule-override",
    version: 4,
    season: state.catalogue.season,
    exportedAt: new Date().toISOString(),
    entries: state.entries
  }, null, 2);

  const filename = "capsule-override.json";
  const file = new File([text], filename, { type: "application/json" });

  // Sur mobile, la feuille de partage est le geste naturel : AirDrop, messages, Drive.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Sauvegarde Capsule Override" });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;   // partage annule : ne pas insister
    }
  }

  const blob = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("btn-import").addEventListener("click", () => $("file").click());

$("file").addEventListener("change", async () => {
  const file = $("file").files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    let incoming = parsed.entries || parsed.data || null;

    // Sauvegarde d'une version a profils : on prend le premier.
    if (!incoming && Array.isArray(parsed.profiles) && parsed.profiles.length) {
      incoming = parsed.profiles[0].data;
    }
    if (!incoming || typeof incoming !== "object") throw new Error("format");

    // On ne garde que ce que le catalogue connait.
    const known = new Set(state.catalogue.sprites.map((s) => s.id));
    const variants = new Set(state.catalogue.variants.map((v) => v.id));
    const clean = {};
    for (const [spriteId, slots] of Object.entries(incoming)) {
      if (!known.has(spriteId)) continue;
      for (const [variant, value] of Object.entries(slots || {})) {
        if (variants.has(variant) && (value === 1 || value === 2)) {
          (clean[spriteId] ||= {})[variant] = value;
        }
      }
    }
    const count = Object.values(clean).reduce((n, s) => n + Object.keys(s).length, 0);
    if (!count) throw new Error("vide");

    if (!confirm(`Remplacer votre collection par ce fichier ? ${count} coche${count > 1 ? "s" : ""} seront restaurees.`)) return;

    state.entries = clean;
    saveStore({ immediate: true });
    $("account").close();
    redraw();
  } catch {
    alert("Ce fichier n'est pas une sauvegarde Capsule Override valide.");
  } finally {
    $("file").value = "";
  }
});

/* ============================================================
   Panneau reglages
   ============================================================ */
$("btn-account").addEventListener("click", async () => {
  const persisted = await navigator.storage?.persisted?.().catch(() => null);
  $("storage-state").textContent = persisted
    ? "Vos donnees sont marquees comme durables : le navigateur ne les effacera pas pour faire de la place."
    : "Le navigateur peut effacer ces donnees s'il manque d'espace. Exportez une sauvegarde de temps en temps.";
  $("account").showModal();
});
$("account-close").addEventListener("click", () => $("account").close());

$("btn-wipe").addEventListener("click", () => {
  if (!confirm("Decocher toute la collection sur cet appareil ? C'est definitif.")) return;
  state.entries = {};
  try {
    localStorage.removeItem(K_STORE);
    for (const key of [...K_LEGACY_PROFILES, K_LEGACY_ACTIVE, K_LEGACY_FLAT]) {
      localStorage.removeItem(key);
    }
  } catch { /* rien a nettoyer */ }
  $("account").close();
  redraw();
});

/* ============================================================
   Installation sur mobile
   ============================================================ */
const installBtn = $("btn-install");
let installPrompt = null;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  if (!isStandalone()) installBtn.hidden = false;
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installBtn.hidden = true;
});

installBtn.addEventListener("click", async () => {
  if (installPrompt) {
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") installBtn.hidden = true;
    installPrompt = null;
    return;
  }
  $("ios-install").showModal();   // Safari n'expose aucune API : on explique le geste.
});

$("ios-close").addEventListener("click", () => $("ios-install").close());

if (isIOS() && !isStandalone()) installBtn.hidden = false;

/* ============================================================
   Service worker
   ============================================================ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register(new URL("sw.js", location.href), { scope: "./" });

      const offerUpdate = (worker) => {
        const toast = $("update-toast");
        toast.hidden = false;
        $("btn-update").onclick = () => {
          worker.postMessage("skip-waiting");
          toast.hidden = true;
        };
      };

      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);

      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
        });
      });

      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
    } catch {
      // Pas de HTTPS ou navigateur sans service worker : l'app fonctionne quand meme.
    }
  });
}

/* ============================================================
   Demarrage
   ============================================================ */
function redraw() {
  state.catalogue.sprites.forEach(paintCard);
  renderStats();
  applyFilters();
}

async function boot() {
  try { theme = localStorage.getItem(K_THEME) || "auto"; } catch { /* navigation privee */ }
  applyTheme(theme, { persist: false });

  try {
    const res = await fetch("sprites.json", { cache: "no-cache" });
    state.catalogue = await res.json();
  } catch {
    document.body.innerHTML =
      '<main class="gate"><div class="gate-card"><div class="gate-top">' +
      "<h1>Catalogue introuvable</h1><p>Le fichier sprites.json n'a pas pu etre charge. " +
      "Rechargez la page ; si vous etes hors ligne, ouvrez l'app une fois avec du reseau.</p>" +
      "</div></div></main>";
    return;
  }

  state.live = state.catalogue.sprites.filter((s) => s.released);
  state.denom = state.live.length * state.catalogue.variants.length;

  $("season-label").textContent = `Fortnite · ${state.catalogue.season}`;
  $("s-unlocked-d").textContent = `/${state.denom}`;
  $("s-mastered-d").textContent = `/${state.denom}`;
  $("s-full-d").textContent = `/${state.live.length}`;

  buildCards();
  buildRarityPanel();
  buildFilters();

  state.entries = readStore();

  $("app").hidden = false;
  redraw();

  const persisted = await requestPersistence();
  storageLabel = persisted ? "Garde sur cet appareil" : "Sur cet appareil";
  setSync("live", storageLabel);
}

boot();
