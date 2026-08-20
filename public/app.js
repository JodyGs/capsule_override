/* ============================================================
   Capsule Override — tout se passe sur l'appareil
   Aucun serveur, aucun compte : les coches vivent dans le
   stockage local du navigateur et survivent a la fermeture.
   ============================================================ */

const $ = (id) => document.getElementById(id);

const PALETTE = ["#E8574B", "#2EA5C9", "#7BB33A", "#C879D6", "#E6A32B"];
const MAX_PROFILES = 5;
const K_STORE = "capsule-override.store.v3";
const K_ACTIVE = "capsule-override.active";
const K_LEGACY = ["capsule-override.store.v2", "capsule-override.v1"];

const ICON_U = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>';
const ICON_M = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8.5 7.5 11 12 4l4.5 7L21 8.5l-1.8 9.5H4.8L3 8.5Z"/></svg>';

const state = {
  catalogue: null,
  live: [],
  denom: 0,
  store: { v: 3, profiles: [] },
  activeId: null,
  filters: { q: "", rarity: "all", status: "all", view: "cards" }
};

const cards = new Map();

/* ------------------------------------------------------------
   Stockage
   ------------------------------------------------------------ */
const now = () => Date.now();
const uid = () => `p${now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function readStore() {
  try {
    const raw = localStorage.getItem(K_STORE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.profiles)) return parsed;
    }
    // Reprise des versions precedentes de l'app.
    for (const key of K_LEGACY) {
      const old = localStorage.getItem(key);
      if (!old) continue;
      const parsed = JSON.parse(old);
      if (parsed && Array.isArray(parsed.profiles)) {
        return { v: 3, profiles: parsed.profiles.filter((p) => !p.deleted) };
      }
      if (parsed && typeof parsed === "object") {
        return { v: 3, profiles: [{ id: uid(), name: "Joueur 1", color: PALETTE[0], createdAt: now(), updatedAt: now(), data: parsed }] };
      }
    }
  } catch { /* stockage illisible : on repart proprement */ }
  return { v: 3, profiles: [] };
}

let saveTimer = null;
function saveStore({ immediate = false } = {}) {
  const write = () => {
    try {
      localStorage.setItem(K_STORE, JSON.stringify(state.store));
      if (state.activeId) localStorage.setItem(K_ACTIVE, state.activeId);
      flashSaved();
    } catch {
      setSync("warn", "Stockage plein");
    }
  };
  clearTimeout(saveTimer);
  if (immediate) write();
  else saveTimer = setTimeout(write, 250);
}

const profiles = () => state.store.profiles;
const active = () => profiles().find((p) => p.id === state.activeId) || null;

function statusOf(spriteId, variant) {
  return active()?.data?.[spriteId]?.[variant] || 0;
}

function setStatus(spriteId, variant, value) {
  const profile = active();
  if (!profile) return;
  const bucket = (profile.data ||= {});
  const slot = (bucket[spriteId] ||= {});
  if (value) slot[variant] = value;
  else delete slot[variant];
  if (!Object.keys(slot).length) delete bucket[spriteId];
  profile.updatedAt = now();
  saveStore();
}

/* Demande au navigateur de ne pas evincer nos donnees si la place manque. */
async function requestPersistence() {
  if (!navigator.storage?.persist) return null;
  try {
    const already = await navigator.storage.persisted?.();
    return already || await navigator.storage.persist();
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   Indicateur d'etat
   ------------------------------------------------------------ */
function setSync(kind, label) {
  $("sync").dataset.state = kind;
  $("sync-label").textContent = label;
}

let flashTimer = null;
function flashSaved() {
  setSync("saving", "Enregistre");
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => setSync("live", storageLabel), 1200);
}
let storageLabel = "Sur cet appareil";

/* ------------------------------------------------------------
   Catalogue
   ------------------------------------------------------------ */
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
  if (!btn || !active()) return;

  const { s: spriteId, v: variant } = btn.dataset;
  const level = Number(btn.dataset.lvl);
  const current = statusOf(spriteId, variant);
  // Debloque : bascule. Maitrise : implique debloque, et le retirer laisse debloque.
  const next = level === 1 ? (current >= 1 ? 0 : 1) : (current === 2 ? 1 : 2);

  setStatus(spriteId, variant, next);
  paintCard(state.catalogue.sprites.find((x) => x.id === spriteId));
  renderStats();
  renderRoster();

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
function tally(profile) {
  let unlocked = 0, mastered = 0, full = 0;
  for (const sprite of state.live) {
    let done = 0;
    for (const v of state.catalogue.variants) {
      const value = profile?.data?.[sprite.id]?.[v.id] || 0;
      if (value >= 1) unlocked += 1;
      if (value === 2) { mastered += 1; done += 1; }
    }
    if (done === state.catalogue.variants.length) full += 1;
  }
  return { unlocked, mastered, full };
}

function renderStats() {
  const profile = active();
  const { unlocked, mastered, full } = tally(profile);
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
        const value = profile?.data?.[sprite.id]?.[v.id] || 0;
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

/* ------------------------------------------------------------
   Profils locaux
   ------------------------------------------------------------ */
function renderRoster() {
  const box = $("roster");
  box.innerHTML = "";

  for (const profile of profiles()) {
    const { mastered } = tally(profile);
    const pct = state.denom ? (mastered / state.denom) * 100 : 0;
    const slot = document.createElement("div");
    slot.className = "pslot";
    slot.dataset.active = String(profile.id === state.activeId);
    slot.innerHTML = `
      <button type="button" class="player" data-id="${profile.id}">
        <span class="pname"><span class="pdot" style="background:${esc(profile.color)}"></span>${esc(profile.name)}</span>
        <span class="pstat">${mastered} / ${state.denom} maitrises</span>
        <span class="ptrack"><i style="width:${pct}%"></i></span>
      </button>
      <button type="button" class="pdel" data-del="${profile.id}" aria-label="Retirer ${esc(profile.name)}" title="Retirer ${esc(profile.name)}">&times;</button>`;
    box.appendChild(slot);
  }

  if (profiles().length < MAX_PROFILES) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "padd";
    add.id = "btn-add";
    add.textContent = profiles().length ? "+ Ajouter un joueur" : "+ Creer mon profil";
    box.appendChild(add);
  } else {
    const full = document.createElement("span");
    full.className = "rfull";
    full.textContent = `${MAX_PROFILES} joueurs — c'est complet`;
    box.appendChild(full);
  }

  $("grid").classList.toggle("no-player", !profiles().length);
}

$("roster").addEventListener("click", (e) => {
  if (e.target.closest("#btn-add")) return openProfileSheet();

  const del = e.target.closest(".pdel");
  if (del) {
    const profile = profiles().find((p) => p.id === del.dataset.del);
    if (!profile) return;
    if (!confirm(`Retirer ${profile.name} ? Sa collection sera effacee de cet appareil.`)) return;
    state.store.profiles = profiles().filter((p) => p.id !== profile.id);
    if (state.activeId === profile.id) state.activeId = profiles()[0]?.id || null;
    saveStore({ immediate: true });
    redraw();
    if (!profiles().length) openProfileSheet();
    return;
  }

  const btn = e.target.closest(".player");
  if (btn) {
    state.activeId = btn.dataset.id;
    saveStore({ immediate: true });
    redraw();
  }
});

/* --- feuille de creation de profil --- */
const profileSheet = $("profile-sheet");
let pickedColor = PALETTE[0];

function buildSwatches(container, current, onPick) {
  container.innerHTML = "";
  PALETTE.forEach((color, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sw";
    b.style.background = color;
    b.dataset.color = color;
    b.setAttribute("aria-label", `Couleur ${i + 1}`);
    b.setAttribute("aria-pressed", String(color === current));
    b.addEventListener("click", () => {
      for (const x of container.querySelectorAll(".sw")) {
        x.setAttribute("aria-pressed", String(x === b));
      }
      onPick(color);
    });
    container.appendChild(b);
  });
}

function openProfileSheet() {
  const used = new Set(profiles().map((p) => p.color));
  pickedColor = PALETTE.find((c) => !used.has(c)) || PALETTE[profiles().length % PALETTE.length];
  buildSwatches($("profile-colors"), pickedColor, (c) => { pickedColor = c; });
  $("profile-name").value = "";
  $("profile-name-err").textContent = "";
  $("profile-sheet-cancel").hidden = !profiles().length;
  profileSheet.showModal();
  setTimeout(() => $("profile-name").focus(), 80);
}

$("profile-sheet-cancel").addEventListener("click", () => profileSheet.close());

$("form-profile").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("profile-name").value.trim();
  if (!name) {
    $("profile-name-err").textContent = "Choisissez un pseudo.";
    return;
  }
  if (profiles().length >= MAX_PROFILES) return;

  const profile = { id: uid(), name, color: pickedColor, createdAt: now(), updatedAt: now(), data: {} };
  state.store.profiles.push(profile);
  state.activeId = profile.id;
  saveStore({ immediate: true });
  profileSheet.close();
  redraw();
});

/* ------------------------------------------------------------
   Filtres
   ------------------------------------------------------------ */
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

  const profile = active();
  $("count").textContent =
    `${shown} ${shown > 1 ? "esprits affiches" : "esprit affiche"} · ` +
    `${state.catalogue.sprites.length} au total cette saison` +
    (profile ? ` · collection de ${profile.name}` : " · aucun profil");
}

/* ------------------------------------------------------------
   Sauvegarde manuelle : transferer vers un autre telephone
   ------------------------------------------------------------ */
function backupPayload() {
  return JSON.stringify({
    app: "capsule-override",
    version: 3,
    season: state.catalogue.season,
    exportedAt: new Date().toISOString(),
    profiles: profiles()
  }, null, 2);
}

$("btn-export").addEventListener("click", async () => {
  const text = backupPayload();
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
    let incoming = null;

    if (Array.isArray(parsed.profiles)) {
      incoming = parsed.profiles.filter((p) => p && p.id && !p.deleted);
    } else if (parsed.entries || parsed.data) {
      incoming = [{
        id: uid(), name: parsed.user?.name || "Import",
        color: parsed.user?.color || PALETTE[1],
        createdAt: now(), updatedAt: now(),
        data: parsed.entries || parsed.data
      }];
    }
    if (!incoming?.length) throw new Error("format");

    if (!confirm(`Importer ${incoming.length} profil${incoming.length > 1 ? "s" : ""} ? Un profil deja present sera remplace par la version du fichier.`)) return;

    // Fusion par identifiant : le fichier fait foi pour les profils qu'il contient.
    const byId = new Map(profiles().map((p) => [p.id, p]));
    for (const p of incoming) byId.set(p.id, p);
    state.store.profiles = [...byId.values()]
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .slice(0, MAX_PROFILES);

    if (!active()) state.activeId = profiles()[0]?.id || null;
    saveStore({ immediate: true });
    accountSheet.close();
    redraw();
  } catch {
    alert("Ce fichier n'est pas une sauvegarde Capsule Override valide.");
  } finally {
    $("file").value = "";
  }
});

/* ------------------------------------------------------------
   Panneau reglages
   ------------------------------------------------------------ */
const accountSheet = $("account");

$("btn-account").addEventListener("click", async () => {
  const persisted = await navigator.storage?.persisted?.().catch(() => null);
  $("storage-state").textContent = persisted
    ? "Vos donnees sont marquees comme durables : le navigateur ne les effacera pas pour faire de la place."
    : "Le navigateur peut effacer ces donnees s'il manque d'espace. Exportez une sauvegarde de temps en temps.";
  accountSheet.showModal();
});
$("account-close").addEventListener("click", () => accountSheet.close());

$("btn-wipe").addEventListener("click", () => {
  if (!confirm("Effacer tous les profils et toutes les coches de cet appareil ? C'est definitif.")) return;
  try {
    localStorage.removeItem(K_STORE);
    localStorage.removeItem(K_ACTIVE);
    for (const key of K_LEGACY) localStorage.removeItem(key);
  } catch { /* rien a nettoyer */ }
  state.store = { v: 3, profiles: [] };
  state.activeId = null;
  accountSheet.close();
  redraw();
  openProfileSheet();
});

/* ------------------------------------------------------------
   Installation sur mobile
   ------------------------------------------------------------ */
const installBtn = $("btn-install");
const iosSheet = $("ios-install");
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
  iosSheet.showModal();   // Safari n'expose aucune API : on explique le geste.
});

$("ios-close").addEventListener("click", () => iosSheet.close());

if (isIOS() && !isStandalone()) installBtn.hidden = false;

/* ------------------------------------------------------------
   Service worker
   ------------------------------------------------------------ */
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

/* ------------------------------------------------------------
   Demarrage
   ------------------------------------------------------------ */
function redraw() {
  renderRoster();
  state.catalogue.sprites.forEach(paintCard);
  renderStats();
  applyFilters();
}

async function boot() {
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

  state.store = readStore();
  try { state.activeId = localStorage.getItem(K_ACTIVE); } catch { /* prive */ }
  if (!active()) state.activeId = profiles()[0]?.id || null;

  $("app").hidden = false;
  redraw();

  const persisted = await requestPersistence();
  storageLabel = persisted ? "Garde sur cet appareil" : "Sur cet appareil";
  setSync("live", storageLabel);

  if (!profiles().length) openProfileSheet();
}

boot();
