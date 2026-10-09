/* Les catalogues, les fichiers servis et les notes doivent raconter la meme
   histoire. Aucun DOM ici : du JSON contre des fichiers sur le disque. */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PUB, lire, compteur } from "./dom.mjs";
const { ok, eq, fin } = compteur();

const sprites = lire("sprites.json"), legacy = lire("sprites-legacy.json");
const family = lire("sprites-family.json"), codes = lire("cheat-codes.json");
const txt = (f) => readFileSync(join(PUB, f), "utf8");
const sw = txt("sw.js"), html = txt("index.html"), app = txt("app.js"), css = txt("styles.css");
const script = readFileSync(join(PUB, "..", "scripts", "fetch-sprite-icons.py"), "utf8");
const variantIds = new Set(sprites.variants.map((v) => v.id));
const ids = sprites.sprites.map((s) => s.id);
const own = (s) => s.variants || [...variantIds];
const sortis = sprites.sprites.filter((s) => s.released);

/* ---- l'etat du releve ---- */
eq(sprites.updatedAt, "2026-10-09", "date de releve sprites");
eq(codes.updatedAt, "2026-10-09", "date de releve codes");
ok(html.includes("9 octobre 2026"), "date du pied de page");
eq(sprites.sprites.length, 25, "esprits catalogues");
eq(sprites.variants.length, 6, "lignes de variantes");
eq(sortis.length, 25, "esprits sortis");
eq(sortis.reduce((n, s) => n + own(s).length, 0), 145, "pieces obtenables");
ok(html.includes('id="s-unlocked-d">/145<'), "repli HTML du denominateur");

/* ---- ce qui est annonce mais pas sorti ---- */
const attendus = sprites.sprites.filter((s) => !s.released);
for (const s of attendus) {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(s.releasesOn || ""), `${s.id} porte une date de sortie lisible`);
  ok(s.releasesOn > sprites.updatedAt, `${s.id} sort apres le dernier releve`);
}
ok(app.includes("function soonLabel"), "la carte sait afficher la date de sortie");
ok(app.includes('timeZone: "UTC"'), "la date est lue en UTC, pas dans le fuseau du telephone");
ok(!ids.includes("bullet"), "Bullet, echange contre Onigiri, reste dehors");

/* ---- variantes ---- */
const mega = sprites.sprites.find((s) => s.id === "megaman");
eq(own(mega).length, 1, "Mega Man n'a que sa forme de base");
for (const ligne of ["gold", "cheat", "loot", "bounty", "trick"]) {
  eq(sortis.filter((s) => own(s).includes(ligne)).length, 24, `esprits avec une ${ligne}`);
  ok(!sortis.find((s) => s.id === "megaman" && own(s).includes(ligne)), `Mega Man n'a pas de ${ligne}`);
}
const crown = sprites.sprites.find((s) => s.id === "crown");
eq(own(crown).length, 6, "la Couronne porte les six lignes");
for (const v of ["cheat", "loot", "bounty", "trick"]) {
  ok(typeof crown.variantHow?.[v] === "string", `la Couronne explique sa ${v}`);
}
ok(/ne resteront pas/i.test(sprites.variants.find((v) => v.id === "trick").note || ""),
   "la note Trick or Treat previent qu'elles sont liees a l'evenement");
/* Chaque ligne doit dire ou on la trouve, sinon le plan d'action retombe sur
   un « en partie » passe-partout. */
for (const v of sprites.variants) ok(typeof v.find === "string" && v.find, `la ligne ${v.id} dit ou on la trouve`);

/* ---- raretes ---- */
const rarities = new Set(sprites.rarities.map((r) => r.id));
sprites.sprites.forEach((s) => ok(rarities.has(s.rarity), `rarete connue pour ${s.id}`));
const tally = sprites.sprites.reduce((m, s) => ({ ...m, [s.rarity]: (m[s.rarity] || 0) + 1 }), {});
eq(tally.rare, 10, "esprits Rares");
eq(tally.epic, 6, "esprits Epiques");
eq(tally.legendary, 6, "esprits Legendaires");
eq(tally.mythic, 3, "esprits Mythiques");
/* « A confirmer » reste une rarete valable du catalogue : Epic annonce des
   esprits sans la communiquer. La regle n'est pas qu'il y en ait zero, c'est
   qu'un esprit sorti ne puisse pas rester sans rarete — une fois en jeu, deux
   sources suffisent toujours a la recouper. */
eq(tally.unknown || 0, 0, "aucune rarete en attente pour l'instant");
for (const s of sortis) ok(s.rarity !== "unknown", `${s.id} est sorti : sa rarete est connue`);
ok(sprites.rarities.some((r) => r.id === "unknown"),
   "le libelle « A confirmer » reste disponible");
/* Une rarete n'est publiee qu'une fois recoupee ; sinon la fiche dit pourquoi,
   et il ne peut s'agir que d'un esprit pas encore sorti. */
for (const s of sprites.sprites.filter((x) => x.rarity === "unknown")) {
  ok(/non communiquee|contestee/i.test(s.source), `${s.id} dit pourquoi sa rarete manque`);
  ok(!s.released, `${s.id}, sans rarete, n'est pas encore sorti`);
}

/* ---- l'ordre releve dans le jeu ---- */
const ordre = sprites.order;
eq(new Set(ordre).size, ordre.length, "aucun doublon dans l'ordre");
eq(ordre.length, sprites.sprites.length, "l'ordre couvre tous les esprits");
ordre.forEach((id) => ok(ids.includes(id), `l'ordre ne nomme que des esprits connus : ${id}`));
sprites.sprites.forEach((s) => ok(ordre.includes(s.id), `${s.id} a sa place dans l'ordre`));
eq(ordre[0], "dumpster", "la grille ouvre sur Plongeon dans la benne");
eq(ordre.slice(ordre.indexOf("morgana") + 1, ordre.indexOf("morgana") + 4).join(","),
   "spookydash,deer,vampire", "Spooky Dash, Le Cerf puis Vampire suivent Morgana");
const nonSortis = attendus.map((s) => s.id);
ok(nonSortis.every((id) => ordre.indexOf(id) >= ordre.length - nonSortis.length),
   "les esprits a venir ferment l'ordre");
ok(/recopie|releve/i.test(sprites.orderNote || ""), "l'origine de l'ordre est notee");
ok(app.includes("state.catalogue.order"), "l'app suit l'ordre du catalogue");

/* ---- filtres ---- */
ok(/const STATUS = \[/.test(app), "la table des filtres existe");
ok(app.includes("wants:") && app.includes("every:"), "chaque filtre declare ce qu'il cherche");
ok(!app.includes("values.some((v) => v < 2)"), "l'ancienne regle « pas encore maitrisee » a disparu");
ok(!app.includes('r.id !== "unknown"'), "les puces de rarete ne sont plus filtrees en dur");
ok(app.includes("row.hidden = !keep"), "les lignes hors sujet se cachent aussi");
ok(/\[hidden\]\{display:none !important\}/.test(css), "le style sait cacher une ligne");

/* ---- fin du passe ---- */
const finPasse = sprites.seasonEnd;
ok(/^\d{4}-\d{2}-\d{2}$/.test(finPasse?.date || ""), "l'echeance porte une date lisible");
ok(finPasse.date > sprites.updatedAt, "elle est dans le futur au moment du releve");
ok(/^\d{2}:\d{2}$/.test(finPasse.time || ""), "et une heure lisible");
ok(finPasse.timeConfirmed === false, "l'heure est marquee non confirmee");
ok(/veille|minuteur/i.test(finPasse.note || ""), "la note dit ou trouver l'heure exacte");
ok(app.includes("function seasonEndAt") && app.includes("function humanLeft"), "l'app lit et formate l'echeance");
ok(html.includes('id="deadline-fill"'), "l'encadre a sa jauge");
ok(html.indexOf('id="deadline"') < html.indexOf('class="scores"'), "l'encadre passe avant les compteurs");

/* ---- textes permanents : pas de date qui vieillit ---- */
const DATE_FR = /\b\d{1,2}(?:er)?\s+(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre)\b/i;
for (const e of sprites.events.list) {
  for (const champ of ["name", "what", "advice"]) {
    ok(!DATE_FR.test(e[champ] || ""), `le rendez-vous ${e.id} ne date pas son texte (${champ})`);
  }
}
ok(!DATE_FR.test(sprites.events.note || ""), "la note des rendez-vous ne cite pas de date");
for (const v of sprites.variants) {
  const note = v.note || "";
  ok(!(DATE_FR.test(note) && !/\b(sortie|arriv|entr|eue|livr|octobre)/i.test(note)),
     `la ligne ${v.id} ne renvoie pas a une edition passee`);
}

/* ---- images : declarees, presentes, precachees, rien d'orphelin ---- */
for (const cat of [sprites, legacy]) {
  const connues = new Set(cat.variants.map((v) => v.id));
  for (const s of cat.sprites) {
    if (s.icon) ok(existsSync(join(PUB, `icons/sprites/${s.id}.png`)), `fichier ${s.id}.png`);
    for (const v of s.variantIcons || []) {
      ok(existsSync(join(PUB, `icons/variants/${s.id}-${v}.png`)), `fichier ${s.id}-${v}.png`);
      ok(connues.has(v), `variante connue ${s.id}/${v}`);
      ok(!s.variants || s.variants.includes(v), `illustration ${s.id}-${v} adossee a une variante obtenable`);
    }
  }
}
/* Seuls les esprits pas encore sortis ont le droit de manquer d'illustration. */
for (const s of sortis) {
  ok(s.icon === true, `${s.id}, deja sorti, a son illustration`);
  for (const v of own(s)) {
    if (v === "base") continue;
    ok((s.variantIcons || []).includes(v), `${s.id} illustre sa variante ${v}`);
  }
}
for (const s of sprites.sprites) {
  if (s.icon) ok(sw.includes(`icons/sprites/${s.id}.png`), `precache base ${s.id}`);
  for (const v of s.variantIcons || []) ok(sw.includes(`icons/variants/${s.id}-${v}.png`), `precache ${s.id}-${v}`);
}
/* Garde-fou volontairement rigide : un service worker non renumerote sert
   l'ancienne coquille a tous ceux qui ont deja ouvert l'app. Ce test tombe
   a chaque livraison — c'est le but, on le remonte en connaissance de cause. */
eq(sw.match(/capsule-v(\d+)/)[1], "58", "version du service worker");
const refs = [...sw.matchAll(/\.\/icons\/(?:sprites|variants|family)\/([a-z0-9-]+)\.png/g)].map((m) => m[1]);
const vivants = new Set([...sprites.sprites, ...legacy.sprites, ...family.sprites].flatMap((s) =>
  [s.id, ...(s.variantIcons || []).map((v) => `${s.id}-${v}`)]));
refs.forEach((r) => ok(vivants.has(r), `entree vivante dans le service worker : ${r}`));
eq(new Set(refs).size, refs.length, "aucune entree precachee en double");
ok(script.includes("os.path.exists(os.path.join(OUT_DIR"), "une panne reseau n'efface pas une entree juste");
ok(script.includes("_Sprite_-_Item_-_Fortnite.png") && script.includes("_-_Item_-_Fortnite.png"),
   "le script essaie les deux formes de nom de fichier");
ok(script.includes("WIKI_ALIAS") && script.includes('"Bushranger"'), "le script accepte des noms de rechange");
ok(script.includes('sprite.get("custom")'), "le script epargne les fiches maison");

/* ---- Legacy ---- */
eq(legacy.sprites.length, 25, "esprits Legacy");
eq(legacy.sprites.filter((s) => s.icon).length, 24, "illustrations de base Legacy");
eq(legacy.sprites.reduce((n, s) => n + (s.variants || []).length, 0), 117, "pieces Legacy");

/* ---- la galerie Family ---- */
ok(family.readOnly === true, "Family se declare en lecture seule");
eq(family.sprites.length, 9, "neuf fiches maison");
eq(new Set(family.order).size, 9, "ordre sans doublon");
for (const f of family.sprites) {
  ok(family.order.includes(f.id), `${f.id} a sa place dans l'ordre`);
  ok(existsSync(join(PUB, `icons/family/${f.id}.png`)), `illustration presente ${f.id}`);
  ok(sw.includes(`icons/family/${f.id}.png`), `precache ${f.id}`);
  eq((f.variants || []).join(","), "base", `${f.id} n'a qu'une ligne`);
  ok(Boolean(f.effect && f.source), `${f.id} a son effet et sa source`);
  ok(/^Esprit /.test(f.name), `${f.id} se nomme « Esprit de... »`);
  eq(f.rarity, "mythic", `${f.id} est mythique`);
}
ok(sw.includes("./sprites-family.json"), "le catalogue de la galerie est precache");
for (const mort of ["goat", "cyber"]) {
  ok(!existsSync(join(PUB, `icons/family/${mort}.png`)), `aucune image orpheline ${mort}`);
  ok(!sw.includes(`family/${mort}`), `ni entree de precache orpheline ${mort}`);
}
ok(!sw.includes("icons/sprites/jody"), "la fiche maison ne traine pas cote saison");
ok(!sprites.sprites.some((s) => family.order.includes(s.id)), "aucune fiche maison dans la saison");
ok(app.includes("const readOnly =") && app.includes("if (readOnly()) return;"),
   "l'app reconnait une galerie et refuse d'y ecrire");
ok(app.includes("const galerie = readOnly();"), "l'image d'export reconnait une galerie");
ok(app.includes("const NOTE_LIGNE"), "la legende des cases vides passe a la ligne");
ok(app.includes("const cardToken"), "une fiche peut imposer sa couleur");
for (const t of new Set(family.sprites.map((f) => f.tint))) {
  eq((css.match(new RegExp(`--f-${t}:`, "g")) || []).length, 3,
     `la teinte ${t} est definie dans les trois palettes`);
}

/* ---- codes ---- */
const all = codes.groups.flatMap((g) => g.codes);
eq(all.length, 50, "nombre de codes");
eq(all.filter((c) => c.once).length, 43, "codes a usage unique");
eq(all.filter((c) => c.once === false).length, 7, "codes reutilisables");
eq(new Set(all.map((c) => c.code.toUpperCase())).size, 50, "codes uniques, casse ignoree");
eq(all.filter((c) => c.new).length, 1, "codes marques nouveaux");
ok(all.some((c) => c.code === "VeryScaryPumpkin" && c.new), "nouveau code present VeryScaryPumpkin");
for (const n of ["runSystemOverride", "ImTheRealEdgelord", "IThinkTheKeyFoundMeChat",
                 "CrowsAreAfraid", "PumpkinSpiceLife", "s7h-50p-r03", "Bonerattler", "PowerOut"]) {
  ok(all.some((c) => c.code === n), `code toujours la ${n}`);
}
/* Retires : expire, ou jamais confirme. */
for (const n of ["NoProLlama", "BRB"]) ok(!all.some((c) => c.code === n), `${n} absent`);
/* Un code derriere une quete doit le dire, sinon on le croit casse. */
for (const n of ["runSystemOverride", "ImTheRealEdgelord", "s7h-50p-r03", "YourThoughtsAreMine"]) {
  ok(all.find((c) => c.code === n).warn, `${n} annonce sa condition`);
}
ok(!/\s/.test(all.map((c) => c.code).join("")), "aucun code ne contient d'espace");
for (const c of all) {
  ok(typeof c.reward === "string" && c.reward.length > 0, `recompense renseignee ${c.code}`);
  if (!c.grants) continue;
  const s = sprites.sprites.find((x) => x.id === c.grants.sprite);
  ok(s && own(s).includes(c.grants.variant), `la variante offerte par ${c.code} est obtenable`);
}

/* ---- annonce ---- */
if (/^\d{4}-\d{2}-\d{2}$/.test(sprites.news.version)) {
  ok(sprites.news.version <= sprites.updatedAt,
     `la version d'annonce (${sprites.news.version}) ne devance pas le releve`);
} else {
  ok(/^\d{4}-\d{2}-\d{2}-/.test(sprites.news.version), `version suffixee datee (${sprites.news.version})`);
}
ok(sprites.news.lines.length >= 3, "l'annonce a du contenu");
ok(!sprites.news.lines.some((l) => /[<>]/.test(l)), "l'annonce reste du texte");
fin();
