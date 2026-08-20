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

const iconUrl = (sprite) => `icons/sprites/${sprite.id}.png`;

/* Les esprits pas encore sortis n'ont pas d'icone : on affiche une pastille
   portant leur initiale, teintee de leur rarete. */
function spriteIconMarkup(sprite) {
  if (sprite.icon) {
    return `<img class="sprite-icon" src="${iconUrl(sprite)}" alt="" width="44" height="44" loading="lazy" decoding="async">`;
  }
  return `<span class="sprite-icon is-empty" aria-hidden="true">${esc(sprite.name.trim()[0] || "?")}</span>`;
}

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
        <div class="ident">
          ${spriteIconMarkup(sprite)}
          <h2 class="name">${esc(sprite.name)}<em>${esc(sprite.sub)}</em></h2>
        </div>
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
   Export en image : une liste a envoyer par message
   ============================================================ */

/* Les glyphes sont ceux de l'interface, en donnees de chemin SVG.
   Construits a la demande : sur un navigateur sans Path2D, seul l'export
   est indisponible, le reste de l'app continue de fonctionner. */
const GLYPH_CHECK = "M4.5 12.5 9.5 17.5 19.5 6.5";
const GLYPH_STAR = "M3 8.5 7.5 11 12 4l4.5 7L21 8.5l-1.8 9.5H4.8L3 8.5Z";

/* Dessine un glyphe defini sur une grille de 24, a la taille voulue. */
function glyph(ctx, path, x, y, size, { fill, stroke, width = 3 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(path);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}

/* Les couleurs viennent du theme actif : l'image ressemble a ce qu'on voit. */
function palette() {
  const css = getComputedStyle(document.documentElement);
  const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: read("--bg", "#0F0C16"),
    surface: read("--surface", "#181322"),
    surface2: read("--surface-2", "#1F1930"),
    line: read("--line", "#2D2542"),
    ink: read("--ink", "#EFEBF7"),
    ink2: read("--ink-2", "#A9A1C0"),
    ink3: read("--ink-3", "#7C7398"),
    accent: read("--accent", "#2BE3E8"),
    accentInk: read("--accent-ink", "#07222A"),
    gold: read("--gold", "#FFC93C"),
    rarity: {
      rare: read("--r-rare", "#5AA2FF"),
      epic: read("--r-epic", "#B478FF"),
      legendary: read("--r-legendary", "#FFA33F"),
      mythic: read("--r-mythic", "#FFE05C"),
      unknown: read("--ink-3", "#7C7398")
    }
  };
}

async function loadFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('700 34px "Chakra Petch"'),
      document.fonts.load('600 20px "Chakra Petch"'),
      document.fonts.load('500 14px "IBM Plex Mono"'),
      document.fonts.load('600 14px "IBM Plex Mono"')
    ]);
    await document.fonts.ready;
  } catch { /* on se rabattra sur les polices systeme */ }
}

/* Le canvas ne peut dessiner que des images deja chargees. */
async function loadSpriteIcons(sprites) {
  const pairs = await Promise.all(sprites.map(async (sprite) => {
    if (!sprite.icon) return [sprite.id, null];
    try {
      const img = new Image();
      img.src = iconUrl(sprite);
      await (img.decode ? img.decode() : new Promise((ok, ko) => {
        img.onload = ok;
        img.onerror = ko;
      }));
      return [sprite.id, img];
    } catch {
      return [sprite.id, null];   // une icone manquante ne doit pas bloquer l'export
    }
  }));
  return new Map(pairs);
}

async function renderCollectionImage() {
  await loadFonts();

  const pathCheck = new Path2D(GLYPH_CHECK);
  const pathStar = new Path2D(GLYPH_STAR);

  const c = palette();
  const rows = state.live;
  const variants = state.catalogue.variants;
  const icons = await loadSpriteIcons(rows);

  const W = 900;
  const PAD = 40;
  const HEAD = 292;
  const ROW = 64;
  const FOOT = 92;
  const H = HEAD + rows.length * ROW + FOOT;

  // Deux fois la taille : l'image reste nette une fois reduite par la messagerie.
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.textBaseline = "alphabetic";

  const display = (size, weight = 700) => `${weight} ${size}px "Chakra Petch", system-ui, sans-serif`;
  const mono = (size, weight = 500) => `${weight} ${size}px "IBM Plex Mono", ui-monospace, monospace`;

  /* --- fond --- */
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  /* --- entete --- */
  ctx.fillStyle = c.accent;
  roundRect(ctx, PAD, 38, 118, 30, 5);
  ctx.fill();
  ctx.fillStyle = c.accentInk;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText("OVERRIDE", PAD + 13, 58);

  ctx.fillStyle = c.ink;
  ctx.font = display(38);
  ctx.fillText("Capsule Override", PAD, 116);

  ctx.fillStyle = c.ink3;
  ctx.font = mono(13);
  ctx.fillText(String(state.catalogue.season).toUpperCase(), PAD, 140);

  /* --- score --- */
  let unlocked = 0, mastered = 0;
  for (const sprite of rows) {
    for (const v of variants) {
      const value = statusOf(sprite.id, v.id);
      if (value >= 1) unlocked += 1;
      if (value === 2) mastered += 1;
    }
  }
  const denom = state.denom;
  const pct = denom ? Math.round((mastered / denom) * 100) : 0;

  // Deux chiffres de meme rang : ce qui est acquis, et ce qui est maitrise.
  const masteredText = `${mastered}/${denom}`;
  const unlockedText = `${unlocked}/${denom}`;

  ctx.font = display(46);
  const gap = Math.max(230, ctx.measureText(masteredText).width + 90);

  const scoreBlock = (x, value, label, color) => {
    ctx.fillStyle = color;
    ctx.font = display(46);
    ctx.fillText(value, x, 194);
    ctx.fillStyle = c.ink3;
    ctx.font = mono(12, 600);
    ctx.fillText(label, x + 2, 216);
  };
  scoreBlock(PAD, unlockedText, "DEBLOQUES", c.accent);
  scoreBlock(PAD + gap, masteredText, "MAITRISES", c.gold);

  ctx.textAlign = "right";
  ctx.fillStyle = c.ink2;
  ctx.font = display(28, 600);
  ctx.fillText(`${pct}%`, W - PAD, 194);
  ctx.fillStyle = c.ink3;
  ctx.font = mono(12, 600);
  ctx.fillText("MAITRISE", W - PAD, 216);
  ctx.textAlign = "left";

  /* --- barre de progression --- */
  const barY = 238, barW = W - PAD * 2, barH = 8;
  ctx.fillStyle = c.surface2;
  roundRect(ctx, PAD, barY, barW, barH, 4);
  ctx.fill();
  if (mastered) {
    ctx.fillStyle = c.gold;
    roundRect(ctx, PAD, barY, (barW * mastered) / denom, barH, 4);
    ctx.fill();
  }
  if (unlocked > mastered) {
    ctx.fillStyle = c.accent;
    roundRect(ctx, PAD + (barW * mastered) / denom, barY, (barW * (unlocked - mastered)) / denom, barH, 4);
    ctx.fill();
  }

  /* --- colonnes --- */
  const colX = [W - PAD - 180, W - PAD - 110, W - PAD - 34];
  ctx.fillStyle = c.ink3;
  ctx.font = mono(11, 600);
  ctx.textAlign = "center";
  variants.forEach((v, i) => {
    const label = v.id === "cheat" ? "CHEAT M." : v.name.toUpperCase();
    ctx.fillText(label, colX[i], HEAD - 18);
  });
  ctx.textAlign = "left";

  /* --- lignes --- */
  rows.forEach((sprite, i) => {
    const y = HEAD + i * ROW;
    const complete = variants.every((v) => statusOf(sprite.id, v.id) === 2);

    ctx.fillStyle = i % 2 ? c.surface : c.surface2;
    roundRect(ctx, PAD, y + 5, W - PAD * 2, ROW - 10, 8);
    ctx.fill();

    // Liseré de rareté
    ctx.fillStyle = c.rarity[sprite.rarity] || c.ink3;
    roundRect(ctx, PAD, y + 13, 3, ROW - 26, 2);
    ctx.fill();

    // Icone de l'esprit, ou pastille a initiale si elle n'existe pas encore.
    const icon = icons.get(sprite.id);
    const iconSize = 40;
    const iconX = PAD + 18, iconY = y + (ROW - iconSize) / 2;
    if (icon) {
      ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
    } else {
      ctx.fillStyle = c.rarity[sprite.rarity] || c.ink3;
      ctx.globalAlpha = 0.16;
      roundRect(ctx, iconX, iconY, iconSize, iconSize, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.rarity[sprite.rarity] || c.ink3;
      ctx.font = display(20, 700);
      ctx.textAlign = "center";
      ctx.fillText(sprite.name.trim()[0] || "?", iconX + iconSize / 2, iconY + iconSize / 2 + 7);
      ctx.textAlign = "left";
    }

    const textX = iconX + iconSize + 16;
    ctx.fillStyle = complete ? c.gold : c.ink;
    ctx.font = display(20, 600);
    ctx.fillText(sprite.name, textX, y + 33);

    ctx.fillStyle = c.ink3;
    ctx.font = mono(11);
    const rarity = (state.catalogue.rarities.find((r) => r.id === sprite.rarity)?.label || "").toUpperCase();
    ctx.fillText(complete ? `${rarity} · COMPLET` : rarity, textX, y + 50);

    variants.forEach((v, k) => {
      const value = statusOf(sprite.id, v.id);
      const cx = colX[k] - 11, cy = y + 20;
      if (value === 2) glyph(ctx, pathStar, cx, cy, 22, { fill: c.gold });
      else if (value === 1) glyph(ctx, pathCheck, cx, cy, 22, { stroke: c.accent, width: 3 });
      else {
        ctx.fillStyle = c.line;
        roundRect(ctx, cx + 5, cy + 10, 12, 3, 2);
        ctx.fill();
      }
    });
  });

  /* --- legende et pied de page --- */
  const footY = HEAD + rows.length * ROW + 26;
  ctx.fillStyle = c.line;
  ctx.fillRect(PAD, footY - 18, W - PAD * 2, 1);

  glyph(ctx, pathCheck, PAD, footY - 6, 18, { stroke: c.accent, width: 3 });
  ctx.fillStyle = c.ink2;
  ctx.font = mono(12);
  ctx.fillText("debloque", PAD + 24, footY + 8);

  glyph(ctx, pathStar, PAD + 110, footY - 6, 18, { fill: c.gold });
  ctx.fillText("maitrise (extrait au niveau 5)", PAD + 134, footY + 8);

  ctx.fillStyle = c.ink3;
  ctx.font = mono(11);
  const upcoming = state.catalogue.sprites.length - rows.length;
  const host = location.hostname && !/^(localhost|127\.|\[?::1)/.test(location.hostname)
    ? location.hostname : "";
  const notes = [];
  if (upcoming > 0) notes.push(`${upcoming} esprits pas encore sortis, non comptes`);
  if (host) notes.push(host);
  if (notes.length) ctx.fillText(notes.join("  ·  "), PAD, footY + 32);

  const stamp = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  ctx.textAlign = "right";
  ctx.fillText(stamp, W - PAD, footY + 32);
  ctx.textAlign = "left";

  return new Promise((done, fail) => {
    canvas.toBlob((blob) => (blob ? done(blob) : fail(new Error("canvas"))), "image/png");
  });
}

/* Message furtif en bas d'ecran. */
let noticeTimer = null;
function notify(message) {
  const box = $("notice");
  $("notice-text").textContent = message;
  box.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { box.hidden = true; }, 3600);
}

/* Trois voies, de la plus directe a la plus manuelle :
   la feuille de partage du telephone, le presse-papier, puis le telechargement. */
async function shareImage(blob, filename) {
  const file = new File([blob], filename, { type: "image/png" });

  // 1. Telephone : ouvre WhatsApp, Messages, Discord… directement.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Ma collection d'esprits" });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
      // Tout autre echec : on tente la suite.
    }
  }

  // 2. Ordinateur : l'image atterrit dans le presse-papier, prete a coller.
  if (navigator.clipboard?.write && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return "copied";
    } catch { /* permission refusee ou format non gere */ }
  }

  // 3. Dernier recours : on la telecharge.
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return "downloaded";
}

if (typeof Path2D === "undefined") {
  // Navigateur trop ancien pour le canvas : on retire l'affordance plutot
  // que de proposer un bouton qui echouera.
  $("btn-export").hidden = true;
}

$("btn-export").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Generation…";

  try {
    const blob = await renderCollectionImage();
    const stamp = new Date().toISOString().slice(0, 10);
    const outcome = await shareImage(blob, `capsule-override-${stamp}.png`);

    if (outcome === "shared") $("account").close();
    else if (outcome === "copied") {
      $("account").close();
      notify("Image copiee — collez-la dans votre conversation.");
    } else if (outcome === "downloaded") {
      notify("Image enregistree dans vos telechargements.");
    }
  } catch {
    notify("L'image n'a pas pu etre generee sur cet appareil.");
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
});

/* ============================================================
   Sauvegarde JSON : transferer vers un autre telephone
   ============================================================ */
$("btn-backup").addEventListener("click", async () => {
  const text = JSON.stringify({
    app: "capsule-override",
    version: 4,
    season: state.catalogue.season,
    exportedAt: new Date().toISOString(),
    entries: state.entries
  }, null, 2);

  const filename = "capsule-override.json";
  const file = new File([text], filename, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Sauvegarde Capsule Override" });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
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
