/* ============================================================
   Capsule Override — tout se passe sur l'appareil
   Aucun serveur, aucun compte : les coches vivent dans le
   stockage local du navigateur et survivent a la fermeture.
   ============================================================ */

const $ = (id) => document.getElementById(id);

/* Deux collections, chacune avec son catalogue et son propre stockage.
   Rien n'est partage entre elles : ni les coches, ni les compteurs, ni l'export. */
const COLLECTIONS = {
  current: { file: "sprites.json",        store: "capsule-override.store.v4",   label: "Saison en cours" },
  legacy:  { file: "sprites-legacy.json", store: "capsule-override.legacy.v1",  label: "Saisons passees" }
};

const K_COLLECTION = "capsule-override.collection";
const K_THEME = "capsule-override.theme";
const K_PLAYER = "capsule-override.player.v1";
// Sauvegardes laissees par les versions precedentes de l'app.
const K_LEGACY_PROFILES = ["capsule-override.store.v3", "capsule-override.store.v2"];
const K_LEGACY_ACTIVE = "capsule-override.active";
const K_LEGACY_FLAT = "capsule-override.v1";

const ICON_U = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>';
const ICON_M = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8.5 7.5 11 12 4l4.5 7L21 8.5l-1.8 9.5H4.8L3 8.5Z"/></svg>';

const state = {
  which: "current",     // clef dans COLLECTIONS
  catalogue: null,
  live: [],
  denom: 0,
  entries: {},
  filters: { q: "", rarity: "all", status: "all", view: "cards" }
};

const catalogueCache = new Map();
const storeKey = () => COLLECTIONS[state.which].store;

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
   Pseudo Epic Games
   Demande une seule fois : tant qu'il n'est pas enregistre, la fiche
   s'ouvre au demarrage ; des qu'il l'est, plus personne ne la reclame.
   ============================================================ */
const PLAYER_MIN = 3;
const PLAYER_MAX = 16;   // limite d'Epic sur les noms affiches

function readPlayer() {
  try {
    const raw = localStorage.getItem(K_PLAYER);
    if (!raw) return "";
    // Les tout premiers enregistrements etaient une simple chaine.
    const value = raw.trim().startsWith("{") ? JSON.parse(raw)?.name : raw;
    return typeof value === "string" ? value.trim() : "";
  } catch { return ""; }
}

function writePlayer(name) {
  try {
    if (name) localStorage.setItem(K_PLAYER, JSON.stringify({ name, setAt: now() }));
    else localStorage.removeItem(K_PLAYER);
    return true;
  } catch {
    return false;   // navigation privee ou stockage plein
  }
}

/* Espaces multiples ecrases, bords rognes : « Jody  Gs » et « Jody Gs  »
   sont le meme joueur. */
const cleanPlayer = (value) => String(value || "").replace(/\s+/g, " ").trim();

function playerProblem(name) {
  if (!name) return "Entrez votre pseudo, ou choisissez « Plus tard ».";
  if (name.length < PLAYER_MIN) return `Trop court : ${PLAYER_MIN} caracteres au minimum.`;
  if (name.length > PLAYER_MAX) return `Trop long : ${PLAYER_MAX} caracteres au maximum.`;
  return "";
}

function paintPlayer() {
  const name = readPlayer();
  const chip = $("btn-player");
  chip.hidden = !name;
  $("player-name").textContent = name;
  chip.setAttribute("aria-label", name ? `Pseudo Epic : ${name}. Modifier.` : "Definir mon pseudo Epic");
  $("player-current").textContent = name || "Pas encore renseigne";
  $("player-current").classList.toggle("is-empty", !name);
}

const playerDialog = $("player");

function openPlayer({ first = false } = {}) {
  const name = readPlayer();
  $("player-title").textContent = first ? "Votre pseudo Epic" : "Changer de pseudo";
  $("player-intro").hidden = !first;
  $("player-skip").hidden = !first;          // hors premiere fois, on ferme par la croix
  $("player-close").hidden = first;
  $("player-forget").hidden = first || !name;
  $("player-save").textContent = first ? "Enregistrer" : "Mettre a jour";
  $("player-error").hidden = true;
  $("player-input").value = name;

  playerDialog.showModal();
  // iOS n'aime pas le focus pose dans le meme battement que l'ouverture.
  setTimeout(() => { try { $("player-input").focus(); $("player-input").select(); } catch { /* champ absent */ } }, 60);
}

$("player-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = cleanPlayer($("player-input").value);
  const problem = playerProblem(name);
  if (problem) {
    $("player-error").textContent = problem;
    $("player-error").hidden = false;
    $("player-input").focus();
    return;
  }
  if (!writePlayer(name)) {
    $("player-error").textContent = "Ce navigateur refuse d'enregistrer : le pseudo sera redemande.";
    $("player-error").hidden = false;
    return;
  }
  paintPlayer();
  playerDialog.close();
  notify(`Pseudo enregistre : ${name}`);
});

// La saisie efface le reproche : on ne laisse pas un message rouge sous un champ corrige.
$("player-input").addEventListener("input", () => { $("player-error").hidden = true; });

$("player-skip").addEventListener("click", () => playerDialog.close());
$("player-close").addEventListener("click", () => playerDialog.close());

$("player-forget").addEventListener("click", () => {
  if (!confirm("Oublier votre pseudo sur cet appareil ? Il vous sera redemande au prochain lancement.")) return;
  writePlayer("");
  paintPlayer();
  playerDialog.close();
});

$("btn-player").addEventListener("click", () => openPlayer());

$("btn-player-edit").addEventListener("click", () => {
  // Deux modales empilees se recouvrent mal sur telephone : on ferme d'abord.
  $("account").close();
  openPlayer();
});

/* ============================================================
   Rendez-vous de la semaine
   Epic annonce ses horaires a New York. On les convertit a l'heure du
   telephone, en tenant compte du changement d'heure — qui ne tombe pas
   le meme jour des deux cotes de l'Atlantique.
   ============================================================ */
const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const zoneFormatters = new Map();

function zoneParts(instant, zone) {
  let dtf = zoneFormatters.get(zone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hour12: false, weekday: "short",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    zoneFormatters.set(zone, dtf);
  }
  const parts = {};
  for (const part of dtf.formatToParts(instant)) parts[part.type] = part.value;
  return parts;
}

/* Decalage entre l'heure murale de la zone et UTC, a cet instant precis. */
function zoneOffset(instant, zone) {
  const p = zoneParts(instant, zone);
  // Certains moteurs rendent minuit comme « 24 » : on ramene a 0.
  const hour = Number(p.hour) % 24;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
  return asUTC - Math.floor(instant.getTime() / 1000) * 1000;
}

/* Instant UTC correspondant a une heure murale dans la zone. Deux passes :
   la premiere devine avec le decalage courant, la seconde corrige si la date
   visee tombe de l'autre cote d'un changement d'heure. */
function instantAt(zone, y, m, d, hh, mm) {
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let pass = 0; pass < 2; pass += 1) {
    guess = Date.UTC(y, m - 1, d, hh, mm) - zoneOffset(new Date(guess), zone);
  }
  return guess;
}

/* Les occurrences encadrant l'instant donne : la veille suffit a rattraper
   un evenement de 24 h commence hier. */
function occurrences(event, zone, now) {
  const [hh, mm] = String(event.start || "00:00").split(":").map(Number);
  const p = zoneParts(new Date(now), zone);
  const today = WEEKDAY[p.weekday];
  const list = [];
  for (let add = -7; add <= 7; add += 1) {
    if ((((today + add) % 7) + 7) % 7 !== event.day) continue;
    const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + add));
    const [y, mo, dd] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
    const start = instantAt(zone, y, mo, dd, hh, mm);
    // Minuit suivant, a New York : c'est la que « aujourd'hui » s'arrete.
    // Ajouter 24 h a l'heure de debut ferait deborder sur le lendemain.
    const dayEnd = instantAt(zone, y, mo, dd + 1, 0, 0);
    list.push({ start, dayEnd, end: event.hours ? start + event.hours * 3600000 : null });
  }
  return list.sort((a, b) => a.start - b.start);
}

/* Trois etats possibles : le bonus court en ce moment (« live »), la journee
   est celle de l'evenement sans que ce soit un bonus continu (« today »), ou
   il est encore devant. Un New Sprite Day de 9 h du matin reste la nouvelle
   du jour a midi : le passer sous silence des 9 h 01 serait absurde. */
function eventState(event, zone, now) {
  const occ = occurrences(event, zone, now);
  const live = occ.find((o) => o.end !== null && now >= o.start && now < o.end);
  if (live) return { event, live: true, today: false, at: live.start, until: live.end };

  if (!event.hours) {
    const day = occ.find((o) => now >= o.start && now < o.dayEnd);
    if (day) return { event, live: false, today: true, at: day.start, until: null };
  }
  const next = occ.find((o) => o.start > now);
  return { event, live: false, today: false, at: next ? next.start : null, until: null };
}

/* Celui qui compte : un bonus en cours passe devant, puis l'evenement du
   jour, puis le plus proche. */
function nextEvent(events, now) {
  const zone = events?.zone;
  const list = events?.list;
  if (!zone || !Array.isArray(list) || !list.length) return null;
  const states = list.map((e) => eventState(e, zone, now)).filter((s) => s.at !== null);
  if (!states.length) return null;
  const live = states.filter((s) => s.live).sort((a, b) => a.until - b.until);
  if (live.length) return live[0];
  const today = states.filter((s) => s.today).sort((a, b) => b.at - a.at);
  if (today.length) return today[0];
  return states.sort((a, b) => a.at - b.at)[0];
}

/* « 2 j 3 h », « 3 h 20 », « 12 min ». Au-dela de deux jours l'heure ne sert
   plus a rien, en dessous d'une heure les jours n'existent pas. */
function humanDelay(ms) {
  const total = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  if (days >= 2) return `${days} j`;
  if (days === 1) return hours ? `1 j ${hours} h` : "1 j";
  if (hours >= 1) return minutes ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} h`;
  return `${minutes} min`;
}

const dayTime = new Intl.DateTimeFormat("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" });

let agendaTimer = null;

function paintAgenda() {
  const box = $("agenda");
  // Les saisons passees n'ont plus de rendez-vous : le bandeau n'a pas lieu d'etre.
  const state_ = state.which === "legacy" ? null : nextEvent(state.catalogue?.events, now());
  if (!state_) { box.hidden = true; return; }

  const { event, live, today, at, until } = state_;
  box.hidden = false;
  box.dataset.live = String(live || today);
  $("agenda-name").textContent = event.name;

  if (live) {
    $("agenda-delay").textContent = `en cours — encore ${humanDelay(until - now())}`;
  } else if (today) {
    $("agenda-delay").textContent = "aujourd'hui";
  } else if (event.confirmed === false) {
    // Sans horaire confirme, annoncer un compte a rebours serait mentir.
    $("agenda-delay").textContent = dayTime.format(new Date(at)).split(" ")[0];
  } else {
    $("agenda-delay").textContent = `dans ${humanDelay(at - now())} · ${dayTime.format(new Date(at))}`;
  }
  $("agenda-what").textContent = event.what || "";
}

function startAgenda() {
  clearInterval(agendaTimer);
  paintAgenda();
  // Une minute suffit : le compte a rebours ne descend jamais sous la minute.
  agendaTimer = setInterval(paintAgenda, 60000);
}

// Un telephone qui dort ne fait pas tourner les minuteurs : au reveil, le
// compte a rebours affiche serait celui d'hier soir.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) paintAgenda();
});

/* ============================================================
   Stockage
   ============================================================ */
function readStore() {
  try {
    const raw = localStorage.getItem(storeKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.entries === "object") return parsed.entries || {};
    }
    // Les reprises d'anciennes sauvegardes ne concernent que la saison en cours.
    if (state.which !== "current") return {};

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
      localStorage.setItem(storeKey(), JSON.stringify({ v: 4, updatedAt: now(), entries: state.entries }));
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

/* Toutes les variantes n'existent pas pour tous les esprits : la saison 3 en
   compte de 1 a 8 selon l'esprit. Un catalogue sans precision par esprit
   applique simplement sa liste globale. */
function variantsOf(sprite) {
  if (!Array.isArray(sprite.variants)) return state.catalogue.variants;
  const set = new Set(sprite.variants);
  return state.catalogue.variants.filter((v) => set.has(v.id));
}

/* Nombre total de pieces a collectionner dans la collection courante. */
function countPieces() {
  return state.live.reduce((n, sprite) => n + variantsOf(sprite).length, 0);
}

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
const variantIconUrl = (sprite, variant) => `icons/variants/${sprite.id}-${variant}.png`;

/* Chaque variante a sa propre illustration : la statue doree pour Or, la
   silhouette criblee de code pour Cheat Master. Quand elle manque — un
   esprit pas encore sorti — on retombe sur la pastille de couleur. */
function variantMarkAt(sprite, variant) {
  // La ligne « Base » reprend l'illustration deja affichee en grand : le
  // fichier est le meme, donc deja en cache, et les trois lignes se lisent
  // de la meme facon.
  const src = variant.id === "base"
    ? (sprite.icon ? iconUrl(sprite) : null)
    : (sprite.variantIcons?.includes(variant.id) ? variantIconUrl(sprite, variant.id) : null);
  if (!src) return "<i></i>";
  return `<img class="vicon" src="${src}" alt="" width="26" height="26" loading="lazy" decoding="async"`
       + ` role="button" tabindex="0" title="Voir ${esc(sprite.name)} ${esc(variant.name)} en grand">`;
}

/* Les esprits pas encore sortis n'ont pas d'icone : on affiche une pastille
   portant leur initiale, teintee de leur rarete. */
function spriteIconMarkup(sprite) {
  if (sprite.icon) {
    // width/height reserve la place avant le chargement : sans eux la carte
    // sursaute quand l'image arrive. La taille reelle vient du CSS.
    return `<img class="sprite-icon" src="${iconUrl(sprite)}" alt="" width="96" height="96" loading="lazy" decoding="async"`
         + ` role="button" tabindex="0" title="Voir ${esc(sprite.name)} en grand">`;
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
    card.dataset.sprite = sprite.id;
    card.style.setProperty("--rc", `var(${rarityToken(sprite.rarity)})`);

    let tags = `<span class="tag rarity">${rarityLabel(sprite.rarity)}</span>`;
    if (!sprite.released) tags += '<span class="tag soon">A venir</span>';

    const rows = variantsOf(sprite).map((v) => `
      <div class="vrow ${v.id === "gold" ? "v-gold" : v.id === "cheat" ? "v-cheat" : ""}" data-variant="${v.id}">
        <span class="vname"${v.note ? ` title="${esc(v.note)}"` : ""}>${variantMarkAt(sprite, v)}${esc(v.name)}</span>
        <button type="button" class="tog t-u" data-s="${sprite.id}" data-v="${v.id}" data-lvl="1"
                aria-pressed="false" aria-label="${esc(sprite.name)} ${esc(v.name)} debloque" title="Debloque">${ICON_U}</button>
        <button type="button" class="tog t-m" data-s="${sprite.id}" data-v="${v.id}" data-lvl="2"
                aria-pressed="false" aria-label="${esc(sprite.name)} ${esc(v.name)} maitrise" title="Maitrise — extrait au niveau 5">${ICON_M}</button>
      </div>`).join("");

    // L'icone est un enfant direct de la carte, pas un morceau du bloc de
    // titre : c'est ce qui lui permet d'occuper une colonne a elle seule,
    // a gauche du nom, de l'effet et de la source.
    card.innerHTML = `
      ${spriteIconMarkup(sprite)}
      <div class="card-top">
        <h2 class="name">${esc(sprite.name)}<em>${esc(sprite.sub)}</em></h2>
        <div class="tags">${tags}</div>
      </div>
      <p class="effect">${esc(sprite.effect)}${sprite.unconfirmed ? ' <span class="unconf">(effet non confirme)</span>' : ""}</p>
      <div class="src"><b>Source</b><span>${esc(sprite.source)}</span></div>
      <div class="vt">
        <div class="vt-head">
          <span>Variante</span>
          <span class="vt-key t-u" title="Debloque"><span class="vt-glyph">${ICON_U}</span><em>Deb.</em></span>
          <span class="vt-key t-m" title="Maitrise au niveau 5"><span class="vt-glyph">${ICON_M}</span><em>Mai.</em></span>
        </div>
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
  const own = variantsOf(sprite);
  for (const v of own) {
    if (statusOf(sprite.id, v.id) === 2) mastered += 1;
  }

  const done = mastered === own.length;
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
/* Le compte de la collection courante. Un seul endroit : l'ecran, l'image
   d'export et le message de partage doivent annoncer les memes chiffres. */
function tally() {
  let unlocked = 0, mastered = 0, full = 0;
  for (const sprite of state.live) {
    const own = variantsOf(sprite);
    let done = 0;
    for (const v of own) {
      const value = statusOf(sprite.id, v.id);
      if (value >= 1) unlocked += 1;
      if (value === 2) { mastered += 1; done += 1; }
    }
    if (done === own.length) full += 1;
  }
  const denom = state.denom;
  return { unlocked, mastered, full, denom, pct: denom ? Math.round((mastered / denom) * 100) : 0 };
}

function renderStats() {
  const { unlocked, mastered, full, denom, pct } = tally();
  $("s-unlocked").firstChild.nodeValue = unlocked;
  $("s-mastered").firstChild.nodeValue = mastered;
  $("s-pct").firstChild.nodeValue = pct;
  $("s-full").firstChild.nodeValue = full;
  $("bar-m").style.width = `${(mastered / denom) * 100}%`;
  $("bar-u").style.width = `${((unlocked - mastered) / denom) * 100}%`;

  for (const rarity of ["rare", "epic", "legendary", "mythic"]) {
    const subset = state.live.filter((s) => s.rarity === rarity);
    const d = subset.reduce((n, sprite) => n + variantsOf(sprite).length, 0);
    let ru = 0, rm = 0;
    for (const sprite of subset) {
      for (const v of variantsOf(sprite)) {
        const value = statusOf(sprite.id, v.id);
        if (value >= 1) ru += 1;
        if (value === 2) rm += 1;
      }
    }
    const line = $(`rr-${rarity}`);
    if (!line) continue;
    // Les deux chiffres, aux couleurs de la barre : sans cela on croit a un
    // bug quand on coche « debloque » et que le compteur de maitrises ne bouge pas.
    line.querySelector(".rr-u").textContent = `${ru} / ${d}`;
    line.querySelector(".rr-m").textContent = `${rm} / ${d}`;
    const track = line.nextElementSibling;
    track.querySelector(".m").style.width = d ? `${(rm / d) * 100}%` : "0%";
    track.querySelector(".u").style.width = d ? `${((ru - rm) / d) * 100}%` : "0%";
  }
}

function buildRarityPanel() {
  // Depliee d'office quand la place le permet, repliee sur telephone.
  $("rarity-fold").open = window.matchMedia("(min-width: 621px)").matches;

  const box = $("by-rarity");
  box.innerHTML = "";
  for (const rarity of ["rare", "epic", "legendary", "mythic"]) {
    const el = document.createElement("div");
    el.className = "rr";
    el.innerHTML = `
      <span class="rr-k"><i class="rr-dot" style="background:var(${rarityToken(rarity)})"></i>${rarityLabel(rarity)}</span>
      <span class="rr-v" id="rr-${rarity}">
        <span class="rr-line"><b class="rr-u">0 / 0</b> debloques</span>
        <span class="rr-line"><b class="rr-m">0 / 0</b> maitrises</span>
      </span>
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
  const pending = state.catalogue.sprites.some((x) => !x.released);
  for (const st of STATUS) {
    if (st.id === "soon" && !pending) continue;   // saison close : rien a venir
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

/* --- panneau de filtres repliable (telephone) --- */
const filterPanel = $("filter-panel");
const filtersToggle = $("btn-filters");

filtersToggle.addEventListener("click", () => {
  const open = filterPanel.classList.toggle("is-open");
  filtersToggle.setAttribute("aria-expanded", String(open));
});

$("btn-reset-filters").addEventListener("click", () => {
  state.filters.q = "";
  state.filters.rarity = "all";
  state.filters.status = "all";
  $("q").value = "";
  for (const b of $("rarity-chips").querySelectorAll(".chip")) {
    b.setAttribute("aria-pressed", String(b.dataset.rarity === "all"));
  }
  for (const b of $("status-seg").querySelectorAll("button")) {
    b.setAttribute("aria-pressed", String(b.dataset.status === "all"));
  }
  applyFilters();
});

/* Combien de filtres sont actifs : la pastille evite d'ouvrir le panneau
   juste pour verifier pourquoi la liste est courte. */
function refreshFilterBadge() {
  const active =
    (state.filters.rarity !== "all" ? 1 : 0) +
    (state.filters.status !== "all" ? 1 : 0) +
    (state.filters.q ? 1 : 0);
  const badge = $("filters-count");
  badge.hidden = active === 0;
  badge.textContent = active;
  filtersToggle.classList.toggle("has-filters", active > 0);
  $("btn-reset-filters").hidden = active === 0;
}

function matches(sprite) {
  const f = state.filters;
  if (f.rarity !== "all" && sprite.rarity !== f.rarity) return false;

  const values = variantsOf(sprite).map((v) => statusOf(sprite.id, v.id));
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
  refreshFilterBadge();

  const total = state.catalogue.sprites.length;
  $("count").textContent = shown === total
    ? `${total} esprits cette saison`
    : `${shown} sur ${total} esprits`;
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
  // Seules les lignes de variantes reellement presentes dans la collection.
  const used = new Set(rows.flatMap((sprite) => variantsOf(sprite).map((v) => v.id)));
  const variants = state.catalogue.variants.filter((v) => used.has(v.id));
  const icons = await loadSpriteIcons(rows);

  const PAD = 40;
  const COL = 66;
  // L'image s'elargit avec le nombre de colonnes plutot que de les comprimer.
  const W = Math.max(900, 420 + variants.length * COL + PAD * 2);
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
  const code = state.catalogue.code || "OVERRIDE";
  ctx.font = '10px "Press Start 2P", monospace';
  const codeW = ctx.measureText(code).width + 26;
  ctx.fillStyle = state.which === "legacy" ? c.rarity.legendary : c.accent;
  roundRect(ctx, PAD, 38, codeW, 30, 5);
  ctx.fill();
  ctx.fillStyle = state.which === "legacy" ? c.bg : c.accentInk;
  ctx.fillText(code, PAD + 13, 58);

  ctx.fillStyle = c.ink;
  ctx.font = display(38);
  ctx.fillText("Capsule Override", PAD, 116);

  ctx.fillStyle = c.ink3;
  ctx.font = mono(13);
  ctx.fillText(String(state.catalogue.season).toUpperCase(), PAD, 140);

  // Signature : a qui appartient cette collection.
  const player = readPlayer();
  if (player) {
    ctx.textAlign = "right";
    ctx.fillStyle = c.ink3;
    ctx.font = mono(11, 600);
    ctx.fillText("PSEUDO EPIC", W - PAD, 46);
    ctx.fillStyle = c.ink;
    ctx.font = display(26, 600);
    ctx.fillText(player, W - PAD, 76);
    ctx.textAlign = "left";
  }

  /* --- score --- */
  const { unlocked, mastered, denom, pct } = tally();

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
  const colX = variants.map((_, i) => W - PAD - 33 - (variants.length - 1 - i) * COL);
  ctx.fillStyle = c.ink3;
  ctx.font = mono(11, 600);
  ctx.textAlign = "center";
  const SHORT = { cheat: "CHEAT M.", holofoil: "HOLO." };
  variants.forEach((v, i) => {
    ctx.fillText(SHORT[v.id] || v.name.toUpperCase(), colX[i], HEAD - 18);
  });
  ctx.textAlign = "left";

  /* --- lignes --- */
  rows.forEach((sprite, i) => {
    const y = HEAD + i * ROW;
    const complete = variantsOf(sprite).every((v) => statusOf(sprite.id, v.id) === 2);

    ctx.fillStyle = i % 2 ? c.surface : c.surface2;
    roundRect(ctx, PAD, y + 5, W - PAD * 2, ROW - 10, 8);
    ctx.fill();

    // Liseré de rareté
    ctx.fillStyle = c.rarity[sprite.rarity] || c.ink3;
    roundRect(ctx, PAD, y + 13, 3, ROW - 26, 2);
    ctx.fill();

    // Icone de l'esprit, ou pastille a initiale si elle n'existe pas encore.
    const icon = icons.get(sprite.id);
    const iconSize = 46;
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
      ctx.font = display(23, 700);
      ctx.textAlign = "center";
      ctx.fillText(sprite.name.trim()[0] || "?", iconX + iconSize / 2, iconY + iconSize / 2 + 8);
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

    const own = new Set(variantsOf(sprite).map((v) => v.id));
    variants.forEach((v, k) => {
      if (!own.has(v.id)) return;        // variante inexistante : case laissee vide
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

  if (variants.length > 1) {
    ctx.fillStyle = c.line;
    roundRect(ctx, PAD + 400, footY - 1, 12, 3, 2);
    ctx.fill();
    ctx.fillStyle = c.ink2;
    ctx.fillText("pas encore obtenu", PAD + 424, footY + 8);
    ctx.fillStyle = c.ink3;
    ctx.fillText("case vide = cette variante n'existe pas pour cet esprit", PAD + 590, footY + 8);
  }

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

/* ------------------------------------------------------------
   Ce qui accompagne l'image dans la conversation
   ------------------------------------------------------------ */

/* « Chapitre 7 Saison 4 — Override » : la saison, sans le nom de code
   qui figure deja sur la pastille de l'image. */
const seasonText = () => String(state.catalogue.season || "").split("—")[0].trim();

/* De quelle collection il s'agit, en un mot. */
const collectionWord = () => (state.which === "legacy" ? "Legacy" : "Override");

/* Le titre que reprennent les applications qui n'affichent pas de texte. */
function shareTitle() {
  const player = readPlayer();
  return player
    ? `Les esprits ${collectionWord()} de ${player}`
    : `Mes esprits ${collectionWord()}`;
}

/* Le message pre-rempli dans WhatsApp, Messages, Discord… Volontairement
   court : les chiffres sont deja sur l'image, les repeter ici ferait doublon. */
function shareText() {
  const player = readPlayer();
  return player
    ? `${player} — ma collection d'esprits ${collectionWord()}.`
    : `Ma collection d'esprits ${collectionWord()}.`;
}

/* Nom de fichier : « capsule-override-jody-gs-2026-08-21.png ». */
function shareSlug() {
  return readPlayer().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // accents
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/* Trois voies, de la plus directe a la plus manuelle :
   la feuille de partage du telephone, le presse-papier, puis le telechargement. */
async function shareImage(blob, filename) {
  const file = new File([blob], filename, { type: "image/png" });

  // 1. Telephone : ouvre WhatsApp, Messages, Discord… directement.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      // Certaines applications ignorent le texte quand un fichier l'accompagne :
      // c'est leur choix, l'image porte de toute facon la meme information.
      await navigator.share({ files: [file], title: shareTitle(), text: shareText() });
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
    const who = shareSlug() ? `-${shareSlug()}` : "";
    const suffix = state.which === "legacy" ? "-legacy" : "";
    const outcome = await shareImage(blob, `capsule-override${who}${suffix}-${stamp}.png`);

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
    player: readPlayer() || undefined,
    exportedAt: new Date().toISOString(),
    entries: state.entries
  }, null, 2);

  const who = shareSlug() ? `-${shareSlug()}` : "";
  const suffix = state.which === "legacy" ? "-legacy" : "";
  const filename = `capsule-override${who}${suffix}.json`;
  const file = new File([text], filename, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      const player = readPlayer();
      await navigator.share({
        files: [file],
        title: player ? `Sauvegarde Capsule Override de ${player}` : "Sauvegarde Capsule Override",
        text: (player ? `${player} — collection` : "Collection")
          + ` ${collectionWord()} (${seasonText()}). `
          + "A ouvrir depuis Reglages → Importer un fichier."
      });
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

    // On n'ecrase jamais un pseudo deja pose sur cet appareil.
    const incomingPlayer = cleanPlayer(parsed.player);
    if (incomingPlayer && !readPlayer() && !playerProblem(incomingPlayer)) {
      writePlayer(incomingPlayer);
      paintPlayer();
    }

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
  if (!confirm(`Decocher toute la collection « ${state.catalogue.season} » sur cet appareil ? C'est definitif.`)) return;
  state.entries = {};
  try {
    localStorage.removeItem(storeKey());
    if (state.which === "current") {
      for (const key of [...K_LEGACY_PROFILES, K_LEGACY_ACTIVE, K_LEGACY_FLAT]) {
        localStorage.removeItem(key);
      }
    }
  } catch { /* rien a nettoyer */ }
  $("account").close();
  redraw();
});

/* ============================================================
   Codes du panneau d'administration du lobby
   ============================================================ */
const K_CODES = "capsule-override.codes.v1";
const codesDialog = $("codes");
let codesData = null;
let codesUsed = {};

function readCodes() {
  try {
    const raw = localStorage.getItem(K_CODES);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCodes() {
  try { localStorage.setItem(K_CODES, JSON.stringify(codesUsed)); } catch { /* stockage plein */ }
}

const allCodes = () => (codesData?.groups || []).flatMap((g) => g.codes);
const onceCodes = () => allCodes().filter((c) => c.once);

function refreshCodesBadge() {
  const total = onceCodes().length;
  const used = onceCodes().filter((c) => codesUsed[c.code.toUpperCase()]).length;
  const left = total - used;

  const badge = $("codes-count");
  badge.hidden = left === 0 || !total;
  badge.textContent = left;
  $("btn-codes").title = total
    ? `${left} recompense${left > 1 ? "s" : ""} encore a reclamer sur ${total}`
    : "Les codes du panneau d'administration du lobby";

  const progress = $("codes-progress");
  if (progress) progress.textContent = total ? `${used} / ${total} recompenses` : "";
}

function buildCodes() {
  const box = $("codes-list");
  box.innerHTML = "";

  for (const group of codesData.groups) {
    const section = document.createElement("section");
    section.className = "codes-group";
    section.innerHTML = `
      <h3>${esc(group.label)}</h3>
      ${group.hint ? `<p class="form-note">${esc(group.hint)}</p>` : ""}`;

    const list = document.createElement("ul");
    list.className = "codes-ul";
    for (const entry of group.codes) {
      const key = entry.code.toUpperCase();
      const li = document.createElement("li");
      li.className = "code-row";
      // Tout se coche, y compris les codes reutilisables : ils ne rapportent
      // rien a reclamer, mais on veut pouvoir noter ceux deja essayes.
      const verb = entry.once ? "comme utilise" : "comme deja essaye";
      li.innerHTML = `
        <button type="button" class="code-check${entry.once ? "" : " is-reusable"}"
                data-code="${key}" aria-pressed="false"
                aria-label="Marquer ${esc(entry.code)} ${verb}"
                title="Marquer ${esc(entry.code)} ${verb}">${ICON_U}</button>
        <button type="button" class="code-text" data-copy="${esc(entry.code)}"
                title="Copier ${esc(entry.code)}">${esc(entry.code)}</button>
        <span class="code-reward">${esc(entry.reward)}${
          entry.new ? '<em class="code-tag is-new">nouveau</em>' : ""}${
          entry.tag ? `<em class="code-tag">${esc(entry.tag)}</em>` : ""}${
          entry.once ? "" : '<em class="code-tag">reutilisable</em>'}${
          entry.note ? `<small class="code-note">${esc(entry.note)}</small>` : ""}${
          entry.warn ? `<small class="code-warn">${esc(entry.warn)}</small>` : ""}</span>`;
      list.appendChild(li);
    }
    section.appendChild(list);
    box.appendChild(section);
  }
  paintCodes();
}

function paintCodes() {
  for (const btn of $("codes-list").querySelectorAll(".code-check[data-code]")) {
    const on = Boolean(codesUsed[btn.dataset.code]);
    btn.setAttribute("aria-pressed", String(on));
    btn.closest(".code-row").classList.toggle("is-used", on);
  }
  refreshCodesBadge();
  // Un code coche disparait du plan : le compteur doit suivre.
  if (state.catalogue) refreshTodoBadge();
}

$("codes-list").addEventListener("click", async (e) => {
  const check = e.target.closest(".code-check[data-code]");
  if (check) {
    const key = check.dataset.code;
    if (codesUsed[key]) delete codesUsed[key];
    else codesUsed[key] = true;
    saveCodes();
    paintCodes();
    if (navigator.vibrate) navigator.vibrate(10);
    return;
  }

  const copy = e.target.closest(".code-text");
  if (copy) {
    const text = copy.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      notify(`« ${text} » copie.`);
    } catch {
      notify("Copie impossible ici — recopiez le code a la main.");
    }
  }
});

$("btn-codes-reset").addEventListener("click", () => {
  const n = allCodes().length;
  if (!confirm(`Decocher les ${n} codes ? Vous perdrez le suivi de ceux deja utilises.`)) return;
  codesUsed = {};
  saveCodes();
  paintCodes();
});

$("btn-codes").addEventListener("click", async () => {
  if (!codesData) {
    try {
      const res = await fetch("cheat-codes.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("codes");
      codesData = await res.json();
    } catch {
      notify("La liste des codes n'a pas pu etre chargee.");
      return;
    }
    $("codes-where").textContent = codesData.where || "";
    $("codes-note").textContent = codesData.note || "";
    buildCodes();
  }
  codesDialog.showModal();
});

$("codes-close").addEventListener("click", () => codesDialog.close());

/* Le compteur du bouton doit etre juste des le premier affichage, sans
   attendre que l'utilisateur ouvre la modale. */
async function primeCodes() {
  codesUsed = readCodes();
  try {
    const res = await fetch("cheat-codes.json", { cache: "no-cache" });
    if (!res.ok) return;
    codesData = await res.json();
    $("codes-where").textContent = codesData.where || "";
    $("codes-note").textContent = codesData.note || "";
    buildCodes();
    refreshTodoBadge();
  } catch { /* hors ligne au premier lancement : la modale reessaiera */ }
}

/* ============================================================
   Comparer avec quelqu'un
   Le format de sauvegarde existe deja ; il suffisait de le lire sans
   l'ecrire. Strictement en lecture : la collection locale n'est pas touchee.
   ============================================================ */
const compareDialog = $("compare");

/* Les pieces d'une sauvegarde, ramenees a ce que le catalogue courant
   connait — un fichier d'une autre saison ne doit pas inventer des lignes. */
function piecesOf(entries) {
  const set = new Set();
  for (const sprite of state.live) {
    for (const variant of variantsOf(sprite)) {
      if ((entries?.[sprite.id]?.[variant.id] ?? 0) >= 1) set.add(`${sprite.id}|${variant.id}`);
    }
  }
  return set;
}

function buildCompare(theirs, theirName, theirSeason) {
  const mine = piecesOf(state.entries);
  const yours = piecesOf(theirs);

  const only = (a, b) => [...a].filter((k) => !b.has(k)).map((k) => {
    const [sid, vid] = k.split("|");
    const sprite = state.live.find((x) => x.id === sid);
    const variant = state.catalogue.variants.find((v) => v.id === vid);
    return { sprite, variant };
  });

  const me = readPlayer() || "Vous";
  $("compare-title").textContent = `${me} et ${theirName}`;
  $("compare-score").textContent = `${mine.size} contre ${yours.size} sur ${state.denom}`;

  const warn = $("compare-warn");
  const mismatch = theirSeason && theirSeason !== state.catalogue.season;
  warn.hidden = !mismatch;
  if (mismatch) {
    warn.textContent = `Ce fichier vient de « ${theirSeason} », vous regardez « ${state.catalogue.season} ». `
      + "Seules les pieces communes aux deux sont comparees.";
  }

  const box = $("compare-list");
  box.innerHTML = "";

  const section = (title, hint, pieces) => {
    const el = document.createElement("section");
    el.className = "codes-group";
    el.innerHTML = `<h3>${esc(title)} — ${pieces.length}</h3>${hint ? `<p class="form-note">${esc(hint)}</p>` : ""}`;
    if (pieces.length) {
      const list = document.createElement("ul");
      list.className = "todo-pieces";
      for (const { sprite, variant } of pieces) {
        if (!sprite || !variant) continue;
        const li = document.createElement("li");
        li.innerHTML = `<img class="vicon" src="${variant.id === "base" ? iconUrl(sprite) : variantIconUrl(sprite, variant.id)}"
             alt="" width="22" height="22" loading="lazy" decoding="async"><span>${esc(pieceName(sprite, variant))}</span>`;
        list.appendChild(li);
      }
      el.appendChild(list);
    }
    box.appendChild(el);
  };

  section(`Ce que ${theirName} a et pas vous`, "De quoi savoir quoi lui demander.", only(yours, mine));
  section(`Ce que vous avez et pas ${theirName}`, "", only(mine, yours));
}

$("btn-compare").addEventListener("click", () => $("file-compare").click());

$("file-compare").addEventListener("change", async () => {
  const file = $("file-compare").files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    let entries = parsed.entries || parsed.data || null;
    if (!entries && Array.isArray(parsed.profiles) && parsed.profiles.length) {
      entries = parsed.profiles[0].data;
    }
    if (!entries || typeof entries !== "object") throw new Error("format");

    const name = cleanPlayer(parsed.player) || "l'autre collection";
    $("account").close();
    buildCompare(entries, name, parsed.season || "");
    compareDialog.showModal();
  } catch {
    alert("Ce fichier n'est pas une sauvegarde Capsule Override valide.");
  } finally {
    $("file-compare").value = "";
  }
});

$("compare-close").addEventListener("click", () => compareDialog.close());

/* ============================================================
   Agrandissement
   Une vignette de 26 px dit qu'une variante existe ; elle ne dit pas a
   quoi elle ressemble. Un appui l'ouvre en grand, sans quitter la page.
   ============================================================ */
const zoomDialog = $("zoom");

function openZoom(src, name, sub) {
  $("zoom-img").src = src;
  $("zoom-img").alt = name;
  $("zoom-name").textContent = name;
  $("zoom-sub").textContent = sub || "";
  $("zoom-sub").hidden = !sub;
  zoomDialog.showModal();
}

$("zoom-close").addEventListener("click", () => zoomDialog.close());
// Cliquer a cote ferme : c'est le geste attendu d'une visionneuse.
zoomDialog.addEventListener("click", (e) => {
  if (e.target === zoomDialog) zoomDialog.close();
});

// Annonce en bouton, donc activable au clavier : sans ceci, la tabulation
// mene a une image qui ne repond ni a Entree ni a Espace.
$("grid").addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  if (!e.target.closest(".sprite-icon, .vicon")) return;
  e.preventDefault();
  e.target.click();
});

$("grid").addEventListener("click", (e) => {
  const img = e.target.closest(".sprite-icon, .vicon");
  if (!img) return;
  const card = img.closest(".card");
  const sprite = state.catalogue.sprites.find((x) => x.id === card?.dataset.sprite);
  if (!sprite) return;

  const row = img.closest(".vrow");
  if (row) {
    const variant = state.catalogue.variants.find((v) => v.id === row.dataset.variant);
    openZoom(img.src, `${sprite.name} ${variant?.name || ""}`.trim(), variant?.note || "");
  } else {
    openZoom(img.src, sprite.name, sprite.sub || "");
  }
});

/* ============================================================
   Que faire maintenant
   Le suivi sait ce qui manque, les codes savent ce qui s'obtient d'un mot
   tape dans le lobby. Ce panneau met les deux bout a bout, parce que jusqu'ici
   il fallait faire la jointure de tete.
   ============================================================ */
const todoDialog = $("todo");

/* Le code du lobby qui offre cette piece, s'il existe et s'il n'a pas
   deja ete consomme. */
function codeFor(spriteId, variantId) {
  return allCodes().find((c) => c.grants?.sprite === spriteId
    && c.grants?.variant === variantId
    && !codesUsed[c.code.toUpperCase()]);
}

/* La consigne generale d'une ligne de variante. */
function howToLine(variant) {
  if (variant.id === "cheat") return "En reussissant un code de triche en partie. La recompense n'est pas garantie.";
  if (variant.id === "gold") return "En partie, comme la version de base. Les Power Hours en relancent le taux.";
  if (variant.id === "base") return "Chaque esprit a ses coins de carte.";
  return "En partie.";
}

/* Ce qui distingue cette piece-la des autres de sa ligne : la source propre
   a l'esprit pour une base, ou une exception declaree au catalogue. */
function howToPiece(sprite, variant) {
  return sprite.variantHow?.[variant.id]
    || (variant.id === "base" ? sprite.source || "" : "");
}

function todoPlan() {
  const lobby = [];
  // Une entree par ligne de variante, dans l'ordre du catalogue : grouper par
  // consigne donnait une section par esprit, puisque chacun a sa source.
  const field = new Map();
  const toMaster = [];

  for (const sprite of state.live) {
    for (const variant of variantsOf(sprite)) {
      const value = statusOf(sprite.id, variant.id);
      if (value === 2) continue;
      if (value === 1) { toMaster.push({ sprite, variant }); continue; }

      const code = codeFor(sprite.id, variant.id);
      if (code) { lobby.push({ sprite, variant, code }); continue; }
      if (!field.has(variant.id)) field.set(variant.id, { variant, pieces: [] });
      field.get(variant.id).pieces.push({ sprite, variant, note: howToPiece(sprite, variant) });
    }
  }

  // Les codes qui ne donnent pas de piece : poussiere, XP, gizmos, ecrans.
  const spare = onceCodes().filter((c) => !c.grants && !codesUsed[c.code.toUpperCase()]);
  return { lobby, field: [...field.values()], toMaster, spare };
}

const pieceName = (sprite, variant) =>
  variant.id === "base" ? sprite.name : `${sprite.name} ${variant.name}`;

function buildTodo() {
  const box = $("todo-list");
  box.innerHTML = "";
  const plan = todoPlan();
  const total = plan.lobby.length + plan.field.reduce((n, g) => n + g.pieces.length, 0);

  $("todo-progress").textContent = total
    ? `${total} piece${total > 1 ? "s" : ""} a trouver`
    : "collection complete";

  const section = (title, hint, body) => {
    const el = document.createElement("section");
    el.className = "codes-group";
    el.innerHTML = `<h3>${esc(title)}</h3>${hint ? `<p class="form-note">${esc(hint)}</p>` : ""}`;
    el.appendChild(body);
    box.appendChild(el);
  };

  /* 1. Ce qui s'obtient tout de suite, sans jouer. */
  if (plan.lobby.length) {
    const list = document.createElement("ul");
    list.className = "codes-ul";
    for (const { sprite, variant, code } of plan.lobby) {
      const li = document.createElement("li");
      li.className = "code-row is-todo";
      li.innerHTML = `
        <img class="vicon" src="${variant.id === "base" ? iconUrl(sprite) : variantIconUrl(sprite, variant.id)}"
             alt="" width="26" height="26" loading="lazy" decoding="async">
        <button type="button" class="code-text" data-copy="${esc(code.code)}"
                title="Copier ${esc(code.code)}">${esc(code.code)}</button>
        <span class="code-reward">${esc(pieceName(sprite, variant))}${
          code.warn ? `<small class="code-warn">${esc(code.warn)}</small>` : ""}</span>`;
      list.appendChild(li);
    }
    section("A taper dans le lobby", "Gratuit et immediat : un mot dans le panneau d'administration.", list);
  }

  /* 2. Ce qu'il faut aller chercher en partie, ligne de variante par ligne. */
  for (const { variant, pieces } of plan.field) {
    const list = document.createElement("ul");
    list.className = "todo-rows";
    for (const { sprite, note } of pieces) {
      const li = document.createElement("li");
      li.innerHTML = `<img class="vicon" src="${variant.id === "base" ? iconUrl(sprite) : variantIconUrl(sprite, variant.id)}"
             alt="" width="26" height="26" loading="lazy" decoding="async">`
        + `<span class="todo-name">${esc(pieceName(sprite, variant))}</span>`
        + (note ? `<span class="todo-note">${esc(note)}</span>` : "");
      list.appendChild(li);
    }
    section(`${variant.name} — ${pieces.length} a trouver`, howToLine(variant), list);
  }

  /* 3. Ce qui est deja la mais pas encore banque. */
  if (plan.toMaster.length) {
    const list = document.createElement("ul");
    list.className = "todo-pieces";
    for (const { sprite, variant } of plan.toMaster) {
      const li = document.createElement("li");
      li.innerHTML = `<img class="vicon" src="${variant.id === "base" ? iconUrl(sprite) : variantIconUrl(sprite, variant.id)}"
             alt="" width="22" height="22" loading="lazy" decoding="async"><span>${esc(pieceName(sprite, variant))}</span>`;
      list.appendChild(li);
    }
    section(`A maitriser — ${plan.toMaster.length}`,
            "Niveau 5, puis banque a un site d'extraction ou Victoire Royale en le tenant.", list);
  }

  /* 4. Le reste des codes, qui ne donne pas d'esprit mais reste a prendre. */
  if (plan.spare.length) {
    const el = document.createElement("p");
    el.className = "form-note";
    el.textContent = `${plan.spare.length} autre${plan.spare.length > 1 ? "s" : ""} code${
      plan.spare.length > 1 ? "s" : ""} du lobby ${plan.spare.length > 1 ? "restent" : "reste"
      } a reclamer : poussiere, XP, gizmos et ecrans de chargement.`;
    const row = document.createElement("div");
    row.className = "row";
    row.appendChild(el);
    section("Recompenses a cote de la collection", "", row);
  }

  if (!box.children.length) {
    const done = document.createElement("p");
    done.className = "form-note";
    done.textContent = "Plus rien a faire : les 33 pieces de la saison sont maitrisees.";
    box.appendChild(done);
  }

  $("todo-note").textContent = state.catalogue?.events?.note || "";
}

function refreshTodoBadge() {
  const strip = $("strip");
  const legacy = state.which === "legacy";
  strip.hidden = legacy;
  if (legacy) return;
  // Le compteur annonce ce qui s'obtient sans jouer : c'est le seul chiffre
  // sur lequel on peut agir dans la minute.
  const free = codesData ? todoPlan().lobby.length : 0;
  const badge = $("todo-count");
  badge.hidden = free === 0;
  badge.textContent = free;
  $("btn-todo").title = free
    ? `${free} piece${free > 1 ? "s" : ""} vous attend${free > 1 ? "ent" : ""} derriere un code du lobby`
    : "Ce qu'il reste a trouver, et comment";
}

$("btn-todo").addEventListener("click", () => {
  if (!codesData) { notify("La liste des codes n'a pas encore ete chargee."); return; }
  buildTodo();
  todoDialog.showModal();
});
$("todo-close").addEventListener("click", () => todoDialog.close());

// Copier un code depuis le plan, comme dans la liste des codes.
$("todo-list").addEventListener("click", async (e) => {
  const copy = e.target.closest(".code-text");
  if (!copy) return;
  try {
    await navigator.clipboard.writeText(copy.dataset.copy);
    notify(`« ${copy.dataset.copy} » copie.`);
  } catch {
    notify("Copie impossible ici — recopiez le code a la main.");
  }
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

      // A la toute premiere visite, aucun worker ne controle encore la page :
      // celui qui vient de s'installer prend la main et declenche
      // controllerchange sans qu'il s'agisse d'une mise a jour. Recharger la
      // page a ce moment-la ne fait que la faire clignoter au premier
      // lancement. On ne recharge que si un ancien worker cede sa place.
      const hadController = Boolean(navigator.serviceWorker.controller);
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadController || reloading) return;
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
  refreshTodoBadge();
}

async function fetchCatalogue(which) {
  if (catalogueCache.has(which)) return catalogueCache.get(which);
  const res = await fetch(COLLECTIONS[which].file, { cache: "no-cache" });
  if (!res.ok) throw new Error("catalogue");
  const data = await res.json();
  catalogueCache.set(which, data);
  return data;
}

/* Bascule d'une collection a l'autre : catalogue, coches, compteurs et
   filtres sont entierement reconstruits. Les deux ne se melangent jamais. */
async function loadCollection(which, { remember = true } = {}) {
  state.which = which;
  state.catalogue = await fetchCatalogue(which);
  state.live = state.catalogue.sprites.filter((x) => x.released);
  state.denom = countPieces();
  state.entries = readStore();

  const legacy = which === "legacy";
  document.body.classList.toggle("is-legacy", legacy);
  $("legacy-banner").hidden = !legacy;
  $("legacy-note").textContent = state.catalogue.variantsNote || "";
  $("btn-legacy").setAttribute("aria-pressed", String(legacy));
  const swap = legacy ? "Revenir a la saison en cours" : "Voir les esprits des saisons passees";
  $("btn-legacy-label").textContent = legacy ? "Saison en cours" : "Legacy";
  $("btn-legacy").title = swap;
  $("btn-legacy").setAttribute("aria-label", swap);
  $("season-label").textContent = `Fortnite · ${state.catalogue.season}`;
  $("season-mark").textContent = state.catalogue.code || "OVERRIDE";

  $("s-unlocked-sub").textContent = state.catalogue.variants.length > 1
    ? "pieces collectees" : "esprits rencontres";
  $("s-unlocked-d").textContent = `/${state.denom}`;
  $("s-mastered-d").textContent = `/${state.denom}`;
  $("s-full-d").textContent = `/${state.live.length}`;
  $("s-full-sub").textContent = state.catalogue.variants.length > 1
    ? "toutes variantes maitrisees" : "maitrises et extraits";

  buildCards();
  buildRarityPanel();
  buildFilters();
  startAgenda();
  redraw();

  if (remember) {
    try { localStorage.setItem(K_COLLECTION, which); } catch { /* navigation privee */ }
  }
  // Certains navigateurs anciens ignorent la forme a objet : on retombe
  // sur la signature historique plutot que de laisser remonter une erreur.
  try { window.scrollTo({ top: 0, behavior: "instant" }); }
  catch { try { window.scrollTo(0, 0); } catch { /* pas de defilement ici */ } }
}

$("btn-legacy").addEventListener("click", () => {
  loadCollection(state.which === "legacy" ? "current" : "legacy").catch(() => {
    notify("Le catalogue des saisons passees n'a pas pu etre charge.");
  });
});

async function boot() {
  try { theme = localStorage.getItem(K_THEME) || "auto"; } catch { /* navigation privee */ }
  applyTheme(theme, { persist: false });

  let start = "current";
  try { start = localStorage.getItem(K_COLLECTION) === "legacy" ? "legacy" : "current"; } catch { /* ignore */ }

  try {
    await loadCollection(start, { remember: false });
  } catch (err) {
    console.error("[capsule] chargement impossible", err);
    document.body.innerHTML =
      '<main class="gate"><div class="gate-card"><div class="gate-top">' +
      "<h1>Catalogue introuvable</h1><p>La liste des esprits n'a pas pu etre chargee. " +
      "Rechargez la page ; si vous etes hors ligne, ouvrez l'app une fois avec du reseau.</p>" +
      "</div></div></main>";
    return;
  }

  $("app").hidden = false;

  primeCodes();
  paintPlayer();

  // Premiere utilisation, ou pseudo efface : on le demande. Une fois
  // enregistre, cette fiche ne se rouvre que si on la demande.
  if (!readPlayer()) openPlayer({ first: true });

  const persisted = await requestPersistence();
  storageLabel = persisted ? "Garde sur cet appareil" : "Sur cet appareil";
  setSync("live", storageLabel);
}

boot();
