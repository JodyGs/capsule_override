/* Les catalogues, les fichiers servis et les notes doivent raconter la meme
   histoire. Aucun DOM ici : du JSON contre des fichiers sur le disque. */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PUB, lire, compteur } from "./dom.mjs";
const { ok, eq, fin } = compteur();

const sprites = lire("sprites.json");
const override = lire("sprites-override.json");
const legacy = lire("sprites-legacy.json");
const codes = lire("cheat-codes.json");
const txt = (f) => readFileSync(join(PUB, f), "utf8");
const sw = txt("sw.js"), html = txt("index.html"), app = txt("app.js"), css = txt("styles.css");
const script = readFileSync(join(PUB, "..", "scripts", "fetch-sprite-icons.py"), "utf8");
/* La galerie maison a quitte public/ le 1er novembre : elle n'est plus servie,
   elle est gardee. Les tests la lisent a sa nouvelle place. */
const ARCHIVE = join(PUB, "..", "archive", "famille");
const family = JSON.parse(readFileSync(join(ARCHIVE, "sprites-family.json"), "utf8"));

const variantIds = new Set(sprites.variants.map((v) => v.id));
const ids = sprites.sprites.map((s) => s.id);
const own = (s) => s.variants || [...variantIds];
const sortis = sprites.sprites.filter((s) => s.released);

/* ---- l'etat du releve ---- */
eq(sprites.updatedAt, "2026-11-01", "date de releve sprites");
eq(codes.updatedAt, "2026-11-01", "date de releve codes");
ok(html.includes("1er novembre 2026"), "date du pied de page");
eq(sprites.code, "TREASURE", "code de la saison en cours");
eq(sprites.seasonStart, "2026-11-01", "jour d'ouverture de la saison");
eq(sprites.sprites.length, 11, "esprits catalogues");
eq(sprites.variants.length, 3, "lignes de variantes");
eq(sortis.length, 11, "esprits sortis");
const pieces = sortis.reduce((n, s) => n + own(s).length, 0);
eq(pieces, 31, "pieces obtenables");
/* Le denominateur ecrit en dur dans la page n'est qu'un repli, le temps que le
   script compte — mais un repli faux fait sauter le chiffre sous les yeux au
   chargement. Il se verifie contre le total calcule, pas contre une constante
   qu'il faudrait penser a remonter. */
for (const id of ["s-unlocked-d", "s-mastered-d"]) {
  ok(html.includes(`id="${id}">/${pieces}<`), `repli HTML du denominateur ${id}`);
}
/* Le chiffre annonce dans les notes doit etre celui que le script calcule :
   c'est la phrase que l'utilisateur lit avant de compter lui-meme. */
ok(html.includes(`<strong>${sprites.sprites.length} esprits</strong>`), "les notes annoncent le bon nombre d'esprits");
ok(html.includes(`<strong>${pieces} pieces</strong>`), "les notes annoncent le bon nombre de pieces");

/* ---- ce qui est annonce mais pas sorti ---- */
const attendus = sprites.sprites.filter((s) => !s.released);
for (const s of attendus) {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(s.releasesOn || ""), `${s.id} porte une date de sortie lisible`);
  ok(s.releasesOn > sprites.updatedAt, `${s.id} sort apres le dernier releve`);
}
ok(app.includes("function soonLabel"), "la carte sait afficher la date de sortie");
ok(app.includes('timeZone: "UTC"'), "la date est lue en UTC, pas dans le fuseau du telephone");
/* Deux noms circulent sur une seule liste, et le capitaine qui amene le
   premier n'arrive que le 7 novembre. Un fichier servi n'est pas une sortie. */
for (const premature of ["t-liluzi", "t-transponder"]) {
  ok(!ids.includes(premature), `${premature} attend sa sortie dehors`);
}

/* ---- variantes ---- */
eq(sprites.variants.map((v) => v.id).join(","), "base,fortune,cursed",
   "les trois lignes ouvertes de la saison, dans l'ordre");
/* La ligne Or est annoncee pour le 12 novembre. Elle n'a rien a faire dans le
   catalogue avant d'etre ramassable : elle ferait un filtre vide et un
   denominateur faux. La page, elle, doit l'annoncer. */
ok(!variantIds.has("gold"), "la ligne Or reste dehors jusqu'a sa sortie");
ok(html.includes("12 novembre"), "mais la page annonce sa date");
const seuls = sprites.sprites.filter((s) => own(s).length === 1);
eq(seuls.length, 1, "un seul esprit sans variante");
eq(seuls[0].id, "t-sweetdreams", "et c'est Sweet Dreams");
/* Combien d'esprits portent chaque ligne : les deux lignes de la saison
   couvrent tout le monde sauf Sweet Dreams. */
const ATTENDU_PAR_LIGNE = { fortune: 10, cursed: 10 };
for (const ligne of ["fortune", "cursed"]) {
  eq(sortis.filter((s) => own(s).includes(ligne)).length, ATTENDU_PAR_LIGNE[ligne],
     `esprits avec une ${ligne}`);
  ok(!own(seuls[0]).includes(ligne), `Sweet Dreams n'a pas de ${ligne}`);
}
/* Cursed se paie : l'app doit le dire, sinon on l'equipe en nageant. */
ok(/eau vous blesse/i.test(sprites.variants.find((v) => v.id === "cursed").note || ""),
   "la note Cursed previent du prix a payer");
/* Chaque ligne doit dire ou on la trouve, sinon le plan d'action retombe sur
   un « en partie » passe-partout. */
for (const v of sprites.variants) ok(typeof v.find === "string" && v.find, `la ligne ${v.id} dit ou on la trouve`);
/* La route a change de nature cette saison : ce n'est plus la fouille, c'est
   l'affiche puis la carte puis le coffre enterre. Si la fiche ne le dit pas,
   l'utilisateur cherche avec les reflexes de la saison passee. */
ok(/affiche/i.test(sprites.variants.find((v) => v.id === "base").find || ""),
   "la ligne de base explique la chasse aux affiches");

/* ---- raretes ---- */
const rarities = new Set(sprites.rarities.map((r) => r.id));
sprites.sprites.forEach((s) => ok(rarities.has(s.rarity), `rarete connue pour ${s.id}`));
const tally = sprites.sprites.reduce((m, s) => ({ ...m, [s.rarity]: (m[s.rarity] || 0) + 1 }), {});
/* « A confirmer » est une rarete valable du catalogue. Epic n'a publie aucun
   palier pour cette saison : un seul site en propose, en precisant lui-meme
   les deduire des taux d'apparition, et une deuxieme source le contredit. La
   regle est qu'une rarete ne se publie que recoupee — et qu'a defaut le
   catalogue dise pourquoi, une fois, au lieu de onze fois. */
ok(sprites.rarities.some((r) => r.id === "unknown"),
   "le libelle « A confirmer » reste disponible");
eq(tally.unknown || 0, 11, "raretes restant a confirmer");
ok(/non publi|non communiqu|deduir|recoup/i.test(sprites.rarityNote || ""),
   "le catalogue dit pourquoi les raretes manquent");
ok(/rarete/i.test(html) && html.includes("A confirmer"), "la page l'explique aussi");
for (const s of sprites.sprites.filter((x) => x.rarity === "unknown")) {
  ok(Boolean(s.source), `${s.id} dit au moins ou le chercher`);
}

/* ---- l'ordre releve dans le jeu ---- */
for (const [nom, cat] of [["saison", sprites], ["Override", override]]) {
  const ordre = cat.order;
  eq(new Set(ordre).size, ordre.length, `aucun doublon dans l'ordre (${nom})`);
  eq(ordre.length, cat.sprites.length, `l'ordre couvre tous les esprits (${nom})`);
  ordre.forEach((id) => ok(cat.sprites.some((s) => s.id === id),
    `l'ordre ne nomme que des esprits connus : ${id}`));
  cat.sprites.forEach((s) => ok(ordre.includes(s.id), `${s.id} a sa place dans l'ordre (${nom})`));
  ok(/recopie|releve/i.test(cat.orderNote || ""), `l'origine de l'ordre est notee (${nom})`);
}
eq(sprites.order[0], "t-halfpeeld", "la grille ouvre sur Halfpeel'd, premier de l'annonce");
eq(sprites.order.at(-1), "t-sweetdreams", "et se ferme sur Sweet Dreams, onzieme");
ok(app.includes("state.catalogue.order"), "l'app suit l'ordre du catalogue");

/* ---- filtres ---- */
ok(/const STATUS = \[/.test(app), "la table des filtres existe");
ok(app.includes("wants:") && app.includes("every:"), "chaque filtre declare ce qu'il cherche");
ok(!app.includes("values.some((v) => v < 2)"), "l'ancienne regle « pas encore maitrisee » a disparu");
ok(!app.includes('r.id !== "unknown"'), "les puces de rarete ne sont plus filtrees en dur");
ok(!/\["rare", "epic", "legendary", "mythic"\]/.test(app),
   "le detail par rarete ne porte plus les quatre paliers en dur");
ok(app.includes("const raritesEnJeu"), "il lit les raretes que la collection porte vraiment");
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
eq(sprites.events.list.length, 2, "deux rendez-vous par semaine cette saison");
eq(sprites.events.list.map((e) => e.id).sort().join(","), "captain,mastery", "et ce sont les bons");
eq(sprites.events.zone, "America/New_York", "les horaires restent en heure de New York");
for (const e of sprites.events.list) {
  for (const champ of ["name", "what", "advice"]) {
    ok(!DATE_FR.test(e[champ] || ""), `le rendez-vous ${e.id} ne date pas son texte (${champ})`);
  }
  ok(["master", "new", "find"].includes(e.focus), `le rendez-vous ${e.id} dit ce qu'il sert`);
}
ok(!DATE_FR.test(sprites.events.note || ""), "la note des rendez-vous ne cite pas de date");
for (const v of sprites.variants) {
  const note = v.note || "";
  ok(!(DATE_FR.test(note) && !/\b(sortie|arriv|entr|eue|livr|lancement)/i.test(note)),
     `la ligne ${v.id} ne renvoie pas a une edition passee`);
}

/* ---- images ---- */
/* La saison ouvre sans illustrations : la wiki n'a rien publie le 1er
   novembre, les onze noms y renvoient une 404. C'est un etat legitime, a deux
   conditions — que le catalogue le dise, et qu'aucune fiche ne promette une
   image absente, parce que l'app servirait alors une vignette cassee. */
eq(sprites.iconsPending, true, "le catalogue annonce ses illustrations manquantes");
ok(/404|wiki/i.test(sprites.iconsNote || ""), "et dit pourquoi elles manquent");
for (const s of sprites.sprites) {
  ok(!s.icon, `${s.id} ne promet pas d'illustration qu'il n'a pas`);
  eq((s.variantIcons || []).length, 0, `${s.id} n'en promet pas pour ses variantes`);
}
/* Le script d'icones doit connaitre les nouveaux noms, sinon le jour ou la
   wiki publie il faudra y repenser. */
for (const nom of ["Halfpeel'd", "Sweet_Dreams", "Plundarrgh"]) {
  ok(script.includes(nom), `le script connait ${nom}`);
}
for (const ligne of ["fortune", "cursed"]) {
  ok(script.includes(`"${ligne}":`), `le script connait le prefixe de la ligne ${ligne}`);
}
ok(script.includes("sprites-override.json"), "le script entretient aussi l'archive Override");

/* Les archives, elles, sont completes : chaque fiche sortie a son fichier,
   chaque fichier declare est precache, et rien ne traine. */
for (const [nom, cat] of [["Override", override], ["Runners", legacy]]) {
  const connues = new Set(cat.variants.map((v) => v.id));
  for (const s of cat.sprites) {
    if (s.icon) ok(existsSync(join(PUB, `icons/sprites/${s.id}.png`)), `fichier ${s.id}.png (${nom})`);
    for (const v of s.variantIcons || []) {
      ok(existsSync(join(PUB, `icons/variants/${s.id}-${v}.png`)), `fichier ${s.id}-${v}.png`);
      ok(connues.has(v), `variante connue ${s.id}/${v}`);
      ok(!s.variants || s.variants.includes(v), `illustration ${s.id}-${v} adossee a une variante obtenable`);
    }
  }
}
for (const s of override.sprites.filter((x) => x.released)) {
  ok(s.icon === true, `${s.id}, sorti pendant Override, a garde son illustration`);
  for (const v of s.variants || []) {
    if (v === "base") continue;
    ok((s.variantIcons || []).includes(v), `${s.id} illustre sa variante ${v}`);
  }
}
/* Le precache ne porte que sur Override : c'etait la saison en cours jusqu'a
   hier, ses images sont deja dans la coquille, et les retirer obligerait tous
   ceux qui ont l'app installee a les retelecharger pour consulter l'archive.
   Runners n'y a jamais ete — 117 pieces de plus pour une saison que l'on
   ouvre une fois par an — et la nouvelle saison n'a encore aucune image. */
for (const s of override.sprites) {
  if (s.icon) ok(sw.includes(`icons/sprites/${s.id}.png`), `precache base ${s.id}`);
  for (const v of s.variantIcons || []) ok(sw.includes(`icons/variants/${s.id}-${v}.png`), `precache ${s.id}-${v}`);
}
/* Garde-fou volontairement rigide : un service worker non renumerote sert
   l'ancienne coquille a tous ceux qui ont deja ouvert l'app. Ce test tombe
   a chaque livraison — c'est le but, on le remonte en connaissance de cause. */
eq(sw.match(/capsule-v(\d+)/)[1], "62", "version du service worker");
for (const f of ["./sprites.json", "./sprites-override.json", "./sprites-legacy.json", "./cheat-codes.json"]) {
  ok(sw.includes(f), `catalogue precache ${f}`);
}
const refs = [...sw.matchAll(/\.\/icons\/(?:sprites|variants)\/([a-z0-9-]+)\.png/g)].map((m) => m[1]);
const vivants = new Set([...sprites.sprites, ...override.sprites, ...legacy.sprites].flatMap((s) =>
  [s.id, ...(s.variantIcons || []).map((v) => `${s.id}-${v}`)]));
refs.forEach((r) => ok(vivants.has(r), `entree vivante dans le service worker : ${r}`));
eq(new Set(refs).size, refs.length, "aucune entree precachee en double");
ok(script.includes("os.path.exists(os.path.join(OUT_DIR"), "une panne reseau n'efface pas une entree juste");
ok(script.includes("_Sprite_-_Item_-_Fortnite.png") && script.includes("_-_Item_-_Fortnite.png"),
   "le script essaie les deux formes de nom de fichier");
ok(script.includes("WIKI_ALIAS") && script.includes('"Bushranger"'), "le script accepte des noms de rechange");
ok(script.includes('sprite.get("custom")'), "le script epargne les fiches maison");

/* ---- les trois collections ---- */
/* La clef de stockage reste collee a sa saison, pas a sa place dans le
   bouton. Le 1er novembre, Override est passee en archive : si sa clef avait
   suivi le fichier « saison en cours », les coches de 162 pieces se seraient
   retrouvees sur onze esprits qui n'existaient pas. */
const table = app.match(/const COLLECTIONS = \{[\s\S]*?\n\};/)[0];
const slot = (nom) => (table.match(new RegExp(`${nom}\\s*:\\s*\\{[^}]*\\}`)) || [""])[0];
for (const [nom, fichier, clef] of [
  ["current", "sprites.json", "capsule-override.treasure.v1"],
  ["override", "sprites-override.json", "capsule-override.store.v4"],
  ["legacy", "sprites-legacy.json", "capsule-override.legacy.v1"],
]) {
  const ligne = slot(nom);
  ok(ligne.includes(`"${fichier}"`), `${nom} sert ${fichier}`);
  ok(ligne.includes(`"${clef}"`), `${nom} garde sa clef de stockage ${clef}`);
  ok(existsSync(join(PUB, fichier)), `${fichier} est bien servi`);
}
eq((table.match(/over: true/g) || []).length, 2, "deux saisons closes");
ok(!slot("current").includes("over:"), "la saison en cours n'est pas une archive");
ok(app.includes("const archive = ()"), "l'app a une notion de saison close");
ok(!/state\.which === "legacy"/.test(app),
   "plus aucune collection nommee en dur pour dire « saison finie »");
ok(/state\.which !== "override"/.test(app),
   "les vieilles sauvegardes a profils reviennent a Override, pas a la saison en cours");
ok(!/sprites-family/.test(app) && !/family:/.test(app), "la galerie n'est plus branchee dans l'app");
ok(!/family/.test(sw), "ni precachee");

/* ---- Override, passee en archive ---- */
eq(override.code, "OVERRIDE", "code de l'archive");
eq(override.sprites.length, 27, "esprits Override");
eq(override.sprites.reduce((n, s) => n + (s.variants || []).length, 0), 162, "pieces Override");
eq(override.seasonEnd, "2026-11-01", "date de fermeture d'Override");
ok(typeof override.seasonEnd === "string",
   "une archive n'a plus d'echeance a decompter, juste une date de fin");
ok(!override.events, "ni de rendez-vous a venir");
ok(/Jardin des esprits/i.test(override.note || ""), "l'archive dit ou vivent desormais ces esprits");
ok(/poussiere/i.test(override.note || ""), "et que la poussiere est repartie de zero");
ok(/162/.test(override.variantsNote || ""), "l'archive garde son compte definitif");
/* Ce qui etait vrai d'Override le reste : les regles qui l'ont tenue toute la
   saison suivent le catalogue dans l'archive. */
const megaman = override.sprites.find((s) => s.id === "megaman");
eq((megaman.variants || []).length, 1, "Mega Man n'a eu que sa forme de base");
ok(!override.sprites.some((s) => s.id === "bullet"), "Bullet, echange contre Onigiri, est reste dehors");
eq(override.sprites.filter((s) => s.rarity === "unknown").length, 1, "une seule rarete jamais communiquee");
eq(override.order[0], "dumpster", "l'ordre releve dans le jeu est conserve");
eq(override.sprites.filter((s) => (s.variants || []).includes("quack")).length, 5,
   "Coin-coin n'a touche que cinq esprits");

/* ---- Runners ---- */
eq(legacy.sprites.length, 25, "esprits Legacy");
eq(legacy.sprites.filter((s) => s.icon).length, 24, "illustrations de base Legacy");
eq(legacy.sprites.reduce((n, s) => n + (s.variants || []).length, 0), 117, "pieces Legacy");

/* ---- la galerie maison, mise de cote ---- */
/* Elle sort de l'app mais pas du depot : on la reutilisera autrement. Le test
   verifie que la sauvegarde est complete — catalogue, images, et jusqu'a son
   propre fichier de tests — et que l'app garde la mecanique qui la recevra. */
ok(family.readOnly === true, "la sauvegarde se declare toujours en lecture seule");
eq(family.sprites.length, 9, "neuf fiches maison gardees");
for (const f of family.sprites) {
  ok(existsSync(join(ARCHIVE, "icons", `${f.id}.png`)), `image sauvegardee ${f.id}`);
  ok(!existsSync(join(PUB, `icons/family/${f.id}.png`)), `et plus servie ${f.id}`);
}
ok(existsSync(join(ARCHIVE, "t-family.mjs")), "ses tests partent avec elle");
ok(existsSync(join(ARCHIVE, "README.md")), "et une note dit comment la rebrancher");
ok(!existsSync(join(PUB, "sprites-family.json")), "le catalogue maison n'est plus servi");
/* La mecanique de galerie reste dans l'app : c'est ce qui permettra de la
   rebrancher sans la reecrire. */
ok(app.includes("const readOnly =") && app.includes("if (readOnly()) return;"),
   "l'app reconnait encore une galerie et refuserait d'y ecrire");
ok(app.includes("const galerie = readOnly();"), "l'image d'export reconnait une galerie");
ok(app.includes("const cardToken"), "une fiche peut imposer sa couleur");
for (const t of new Set(family.sprites.map((f) => f.tint))) {
  eq((css.match(new RegExp(`--f-${t}:`, "g")) || []).length, 3,
     `la teinte ${t} est encore definie dans les trois palettes`);
}

/* ---- codes ---- */
const all = codes.groups.flatMap((g) => g.codes);
eq(all.length, 56, "nombre de codes");
eq(all.filter((c) => c.once).length, 48, "codes a usage unique");
eq(all.filter((c) => c.once === false).length, 8, "codes reutilisables");
eq(new Set(all.map((c) => c.code.toUpperCase())).size, 56, "codes uniques, casse ignoree");
/* La pastille « nouveau » marque les codes du releve du jour, et rien d'autre.
   Ce releve-ci n'en a aucun : aucune liste n'avait de nouveaute avant la
   bascule, et aucune ne les a reverifies depuis. Garder les pastilles
   d'octobre aurait fait passer de l'ancien pour du neuf. */
eq(all.filter((c) => c.new).length, 0, "aucun code marque nouveau ce releve");
for (const n of ["SuppliesForTheHunt", "B1gBodySw3rve", "Pr1vat3j3t", "LuhLeakyz",
                 "runSystemOverride", "ImTheRealEdgelord", "IThinkTheKeyFoundMeChat",
                 "CrowsAreAfraid", "PumpkinSpiceLife", "s7h-50p-r03", "Bonerattler", "PowerOut"]) {
  ok(all.some((c) => c.code === n), `code toujours la ${n}`);
}
/* Retire parce qu'expire — et il ne revient pas. */
ok(!all.some((c) => c.code === "NoProLlama"), "NoProLlama, expire le 14 septembre, reste dehors");
/* BRB a passe la saison dehors : une seule liste le portait, un agregateur le
   donnait pour faux. Quatre sources le donnent actif en octobre, il entre —
   mais il doit raconter ce detour, sinon personne ne saura qu'il a ete doute. */
const brb = all.find((c) => c.code === "BRB");
ok(brb, "BRB entre une fois recoupe");
ok(/ecarte/i.test(brb?.warn || ""), "BRB dit pourquoi il n'etait pas la");
eq(brb?.once, false, "BRB est une transformation, donc reutilisable");
/* Un code derriere une quete doit le dire, sinon on le croit casse. */
for (const n of ["runSystemOverride", "ImTheRealEdgelord", "s7h-50p-r03", "YourThoughtsAreMine"]) {
  ok(all.find((c) => c.code === n).warn, `${n} annonce sa condition`);
}
ok(!/\s/.test(all.map((c) => c.code).join("")), "aucun code ne contient d'espace");
/* La liste a traverse la bascule sans annonce d'Epic. Elle reste donc telle
   quelle — mais la page doit porter les deux reserves, sinon on croit les
   recompenses d'Override encore valables. */
ok(/Treasure Hunters/i.test(codes.season), "les codes sont ranges sous la saison en cours");
ok(/reverifi/i.test(codes.note || ""), "la note dit que rien n'a ete reverifie depuis la bascule");
ok(/poussiere|gizmos/i.test(codes.note || ""), "et que la poussiere est repartie de zero");
ok(/bascule/i.test(codes.note || ""), "et que la liste a traverse la bascule telle quelle");
/* L'app n'affiche que `where` et `note` : un troisieme champ d'explication
   dormirait dans le fichier sans jamais arriver sous les yeux. */
for (const mort of ["seasonNote", "warning", "intro"]) {
  ok(!(mort in codes), `pas de champ mort ${mort} dans le catalogue de codes`);
}
ok(/Jardin des esprits/i.test(codes.groups.find((g) => g.id === "sprites").hint || ""),
   "le groupe des esprits offerts dit ou sont passes ces esprits");
/* Les variantes offertes par un code appartiennent a Override : c'est dans
   cette archive, et pas dans la saison en cours, qu'elles doivent exister. */
for (const c of all) {
  ok(typeof c.reward === "string" && c.reward.length > 0, `recompense renseignee ${c.code}`);
  if (!c.grants) continue;
  const s = override.sprites.find((x) => x.id === c.grants.sprite);
  ok(s && (s.variants || []).includes(c.grants.variant),
     `la variante offerte par ${c.code} existe bien dans Override`);
  ok(!sprites.sprites.some((x) => x.id === c.grants.sprite),
     `et ${c.code} ne promet rien de la saison en cours`);
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
/* Une bascule de saison se raconte : ou sont passees les coches d'avant, et
   ce qui a change dans la facon de chasser. */
const annonce = sprites.news.lines.join(" ");
ok(/Override/.test(annonce), "l'annonce dit ce qu'est devenue la saison passee");
ok(/affiche/i.test(annonce), "et explique la nouvelle route vers les esprits");

fin();
