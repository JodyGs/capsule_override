/* Les catalogues, les fichiers servis et les notes doivent raconter la meme
   histoire. Aucun DOM ici : du JSON contre des fichiers sur le disque. */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PUB, lire, compteur } from "./dom.mjs";
const { ok, eq, fin } = compteur();

const sprites = lire("sprites.json");
const override = lire("sprites-override.json");
const legacy = lire("sprites-legacy.json");
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
ok(html.includes("1er novembre 2026"), "date du pied de page");
eq(sprites.code, "TREASURE", "code de la saison en cours");
eq(sprites.seasonStart, "2026-11-01", "jour d'ouverture de la saison");
eq(sprites.sprites.length, 13, "esprits catalogues");
eq(sprites.variants.length, 3, "lignes de variantes");
eq(sortis.length, 12, "esprits sortis");
const pieces = sortis.reduce((n, s) => n + own(s).length, 0);
eq(pieces, 32, "pieces obtenables");
/* Le denominateur ecrit en dur dans la page n'est qu'un repli, le temps que le
   script compte — mais un repli faux fait sauter le chiffre sous les yeux au
   chargement. Il se verifie contre le total calcule, pas contre une constante
   qu'il faudrait penser a remonter. */
for (const id of ["s-unlocked-d", "s-mastered-d"]) {
  ok(html.includes(`id="${id}">/${pieces}<`), `repli HTML du denominateur ${id}`);
}
/* Le chiffre annonce dans les notes doit etre celui que le script calcule :
   c'est la phrase que l'utilisateur lit avant de compter lui-meme. */
ok(html.includes(`<strong>${sortis.length} esprits</strong>`), "les notes annoncent le bon nombre d'esprits sortis");
ok(html.includes(`<strong>${pieces} pieces</strong>`), "les notes annoncent le bon nombre de pieces");

/* ---- ce qui est annonce mais pas sorti ---- */
const attendus = sprites.sprites.filter((s) => !s.released);
for (const s of attendus) {
  ok(/^\d{4}-\d{2}-\d{2}$/.test(s.releasesOn || ""), `${s.id} porte une date de sortie lisible`);
  ok(s.releasesOn > sprites.updatedAt, `${s.id} sort apres le dernier releve`);
}
ok(app.includes("function soonLabel"), "la carte sait afficher la date de sortie");
ok(app.includes('timeZone: "UTC"'), "la date est lue en UTC, pas dans le fuseau du telephone");
/* Un fichier servi n'est pas une sortie — mais une sortie vue en partie en
   est une. Transponder Snail n'est annonce nulle part et ne figure chez aucun
   suiveur ; il est entre sur un signalement en jeu, recoupe par les fichiers
   du jeu. Sa fiche doit porter les deux reserves qui vont avec : l'effet ne
   vient que d'une source, et aucune image n'existe encore. */
const snail = sprites.sprites.find((s) => s.id === "t-snail");
ok(snail?.released, "Transponder Snail est dans la liste");
eq(snail?.unconfirmed, true, "son effet est marque non confirme");
ok(/signale en partie|fichiers du jeu/i.test(snail?.source || ""), "sa fiche dit d'ou il sort");
eq((snail?.variants || []).join(","), "base", "il n'a que sa forme de base");
/* Lil Uzi Vert Jr. est date : il ferme la liste et ne compte pas. Il a son
   illustration avant sa sortie — une fiche a venir illustree vaut mieux
   qu'une pastille, du moment que le fichier existe vraiment. */
const uzi = sprites.sprites.find((s) => s.id === "t-liluzi");
ok(uzi && !uzi.released, "Lil Uzi Vert Jr. figure sans etre sorti");
eq(uzi?.releasesOn, "2026-11-07", "a la date annoncee par Epic");
eq(uzi?.icon, true, "et il a deja son illustration");
ok(existsSync(join(PUB, "icons/sprites/t-liluzi.png")), "dont le fichier est bien la");
eq((uzi?.variants || []).join(","), "base",
   "sans lui preter les variantes qu'une seule source lui donne");

/* ---- variantes ---- */
eq(sprites.variants.map((v) => v.id).join(","), "base,fortune,cursed",
   "les trois lignes ouvertes de la saison, dans l'ordre");
/* Les identifiants restent anglais — ils sont stables et servent de nom de
   fichier — mais ce qui s'affiche est le nom du jeu en francais. */
eq(sprites.variants.find((v) => v.id === "cursed").name, "Malediction",
   "la ligne Cursed porte son nom francais");
/* La ligne Or est annoncee pour le 12 novembre. Elle n'a rien a faire dans le
   catalogue avant d'etre ramassable : elle ferait un filtre vide et un
   denominateur faux. La page, elle, doit l'annoncer. */
ok(!variantIds.has("gold"), "la ligne Or reste dehors jusqu'a sa sortie");
ok(html.includes("12 novembre"), "mais la page annonce sa date");
const seuls = sortis.filter((s) => own(s).length === 1);
eq(seuls.map((s) => s.id).sort().join(","), "t-snail,t-sweetdreams",
   "deux esprits sans variante : Doux reves et l'escargot");
/* Combien d'esprits portent chaque ligne : les deux lignes de la saison
   couvrent tout le monde sauf Sweet Dreams. */
const ATTENDU_PAR_LIGNE = { fortune: 10, cursed: 10 };
for (const ligne of ["fortune", "cursed"]) {
  eq(sortis.filter((s) => own(s).includes(ligne)).length, ATTENDU_PAR_LIGNE[ligne],
     `esprits avec une ${ligne}`);
  for (const seul of seuls) ok(!own(seul).includes(ligne), `${seul.id} n'a pas de ${ligne}`);
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
ok(/avis de recherche/i.test(sprites.variants.find((v) => v.id === "base").find || ""),
   "la ligne de base explique la chasse aux avis de recherche");
/* Le vocabulaire est celui du jeu en francais, pas une traduction maison :
   chercher « affiche » dans l'app ne donnerait rien en partie. */
ok(!/affiches de recherche/i.test(JSON.stringify(sprites) + html),
   "nulle part « affiches de recherche » : le jeu dit « avis de recherche »");

/* ---- les noms ---- */
/* Epic traduit : cinq des onze esprits n'ont pas le meme nom en francais. Le
   nom affiche est celui du jeu, le nom anglais reste en sous-titre parce que
   c'est celui des guides, des listes et des recherches. */
const NOMS_FR = {
  "t-halfpeeld": ["Mi-pelure", "Halfpeel'd"], "t-wayfinder": ["Guide", "Wayfinder"],
  "t-kelper": ["Varech", "Kelper"], "t-squibbly": ["Crapoulpe", "Lil' Squibbly"],
  "t-sweetdreams": ["Doux reves", "Sweet Dreams"], "t-repete": ["Re-Pete", "Re-Pete"],
  "t-barry": ["Barry O'Fish", "Barry O'Fish"], "t-exmarks": ["Exmarks", "Exmarks"],
  "t-plundarrgh": ["Plundarrgh", "Plundarrgh"], "t-chester": ["Chester", "Chester"],
  "t-flacko": ["Lil' Flacko", "Lil' Flacko"],
  // Hors annonce : son nom francais a ete releve dans le jeu, pas dans un texte.
  "t-snail": ["Escargophone", "Transponder Snail"],
  "t-liluzi": ["Lil Uzi Vert Jr.", "Lil Uzi Vert Jr."],
};
for (const s of sprites.sprites) {
  const [fr, en] = NOMS_FR[s.id] || [];
  eq(s.name, fr, `${s.id} porte son nom francais`);
  ok(String(s.sub).startsWith(en), `${s.id} garde son nom anglais en sous-titre`);
}
ok(/version francaise|annonce officielle/i.test(sprites.namesNote || ""),
   "le catalogue dit d'ou viennent les noms");

/* ---- raretes ---- */
const rarities = new Set(sprites.rarities.map((r) => r.id));
sprites.sprites.forEach((s) => ok(rarities.has(s.rarity), `rarete connue pour ${s.id}`));
const tally = sprites.sprites.reduce((m, s) => ({ ...m, [s.rarity]: (m[s.rarity] || 0) + 1 }), {});
/* Epic n'a publie aucun palier cette saison. La regle n'est pas « pas de
   rarete » : c'est « pas de rarete sur une source seule ». Deux traqueurs
   independants s'accordent sur les onze de l'annonce, palier par palier :
   elles sont publiees. Les deux fiches qui n'ont qu'une source restent
   « A confirmer », et le catalogue dit laquelle est laquelle. */
eq(tally.rare, 3, "esprits Rares");
eq(tally.epic, 1, "esprits Epiques");
eq(tally.legendary, 2, "esprits Legendaires");
eq(tally.mythic, 2, "esprits Mythiques");
ok(sprites.rarities.some((r) => r.id === "unknown"),
   "le libelle « A confirmer » reste disponible");
eq(tally.unknown || 0, 5, "les fiches contestees restent a confirmer");
eq(sprites.sprites.filter((s) => s.rarity === "unknown").map((s) => s.id).sort().join(","),
   "t-chester,t-exmarks,t-snail,t-squibbly,t-wayfinder",
   "et ce sont les quatre paliers contestes, plus l'escargot");
ok(/contredit|contestee|ne s'accordent pas/i.test(sprites.rarityNote || ""),
   "le catalogue dit que les sources se contredisent");
ok(/conteste/i.test(html), "la page l'explique aussi");
for (const s of sprites.sprites.filter((x) => x.rarity === "unknown")) {
  ok(/contestee|une seule source|un seul traqueur/i.test(s.source || ""),
     `${s.id} dit pourquoi sa rarete manque`);
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
eq(sprites.order.at(-1), "t-liluzi", "et se ferme sur l'esprit pas encore sorti");
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
/* La pastille « A venir » porte une date : c'est la seule qui ne tienne pas
   en un mot, et elle recouvrait le sous-titre quand le nom passait sur deux
   lignes — ce qui est arrive le jour ou « Lil Uzi Vert Jr. » est entre. */
ok(/\.tag\.soon\{[^}]*white-space:normal/.test(css), "la pastille d'une sortie a venir sait passer a la ligne");

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
/* Les illustrations de cette saison ne viennent pas de la wiki, qui n'avait
   rien publie le 1er novembre, mais de Sprite Catch. Un catalogue doit dire
   d'ou viennent ses images quand ce n'est pas de la source habituelle, et
   l'app doit les crediter. */
ok(!("iconsPending" in sprites), "plus d'attente d'illustrations : elles sont la");
ok(!sprites.sprites.some((s) => s.iconPending), "aucune fiche n'attend plus la sienne");
ok(/Sprite Catch/i.test(sprites.iconsNote || ""), "le catalogue nomme la source des images");
ok(/wiki/i.test(sprites.iconsNote || ""), "et dit que la wiki reste la source de reference");
ok(/Sprite Catch/i.test(html), "la page credite la source des illustrations");
/* Le script doit savoir retrouver ces images tout seul : une URL recopiee a
   la main vieillit en silence, l'empreinte dans le nom de fichier change. */
ok(script.includes("CATCH_SLUG") && script.includes("spritecatch.com/sprites/"),
   "le script sait interroger la deuxieme source");
ok(script.includes("FNS_SLUG") && script.includes("fnsprites.app/sprites/"),
   "et la troisieme, pour ce que les deux premieres n'ont pas");
ok(script.indexOf("return fetch(noms, prefix)") < script.indexOf("catch_urls(sprite_id).get(variant)")
   && script.indexOf("catch_urls(sprite_id).get(variant)") < script.indexOf("FNS_IMAGE.format"),
   "elles sont essayees dans l'ordre : wiki, puis Sprite Catch, puis FN Sprite Tracker");
/* Le troisieme sert aussi des illustrations qui ne sont pas celles du jeu :
   le script doit le dire a qui le relira. */
ok(/ne se rejette pas/i.test(script),
   "le script garde la lecon : une illustration qui detonne se verifie");
ok(script.includes("FeedJet") && script.includes("RookGecko"),
   "et les noms internes des assets, qui identifient un esprit sans ambiguite");
/* Chaque esprit sorti a son illustration et celles de ses variantes : c'est
   le controle qui rattrape l'oubli classique, ajouter un esprit au JSON sans
   lancer le script d'icones. */
for (const s of sortis) {
  /* Un esprit sorti dont aucune source ne sert encore l'image a le droit
     d'attendre — a condition de le dire, fiche par fiche, et que le
     catalogue le nomme. Sans ca, l'app servirait une vignette cassee. */
  if (s.iconPending) {
    ok(!s.icon, `${s.id} attend son image et ne la promet pas`);
    ok(sprites.iconsNote.includes(s.name), `le catalogue nomme ${s.id} parmi les images manquantes`);
    ok(!existsSync(join(PUB, `icons/sprites/${s.id}.png`)), `et aucun fichier ne traine pour ${s.id}`);
    continue;
  }
  ok(s.icon === true, `${s.id}, deja sorti, a son illustration`);
  ok(existsSync(join(PUB, `icons/sprites/${s.id}.png`)), `fichier ${s.id}.png`);
  for (const v of own(s)) {
    if (v === "base") continue;
    ok((s.variantIcons || []).includes(v), `${s.id} illustre sa variante ${v}`);
    ok(existsSync(join(PUB, `icons/variants/${s.id}-${v}.png`)), `fichier ${s.id}-${v}.png`);
  }
  for (const v of s.variantIcons || []) {
    ok(own(s).includes(v), `illustration ${s.id}-${v} adossee a une variante obtenable`);
  }
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
/* Le precache porte sur la saison en cours et sur Override : la premiere
   parce qu'une liste sans images est illisible hors connexion, la seconde
   parce que ses images y etaient deja et que les retirer obligerait chaque
   telephone installe a les retelecharger pour consulter l'archive. Runners
   n'y a jamais ete — 117 pieces de plus pour une saison qu'on ouvre une fois
   par an. */
for (const s of [...sprites.sprites, ...override.sprites]) {
  if (s.icon) ok(sw.includes(`icons/sprites/${s.id}.png`), `precache base ${s.id}`);
  for (const v of s.variantIcons || []) ok(sw.includes(`icons/variants/${s.id}-${v}.png`), `precache ${s.id}-${v}`);
}
/* Garde-fou volontairement rigide : un service worker non renumerote sert
   l'ancienne coquille a tous ceux qui ont deja ouvert l'app. Ce test tombe
   a chaque livraison — c'est le but, on le remonte en connaissance de cause. */
eq(sw.match(/capsule-v(\d+)/)[1], "67", "version du service worker");
for (const f of ["./sprites.json", "./sprites-override.json", "./sprites-legacy.json"]) {
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

/* ---- les codes du lobby, mis de cote ---- */
/* L'ecran est parti avec la bascule : les codes qui versaient une variante
   Cheat Master habillent des esprits d'Override, qui ne se ramassent plus,
   et aucune liste publique ne les a reverifies depuis. La liste reste dans le
   depot — Epic en redistribuera — mais plus rien dans l'app ne doit la
   chercher : un fichier absent et un `fetch` qui traine, c'est une modale
   vide et une erreur silencieuse. */
const CODES = join(PUB, "..", "archive", "codes-du-lobby");
ok(existsSync(join(CODES, "cheat-codes.json")), "la liste est gardee dans l'archive");
ok(existsSync(join(CODES, "README.md")), "et une note dit pourquoi, et comment la rebrancher");
ok(!existsSync(join(PUB, "cheat-codes.json")), "elle n'est plus servie");
const codes = JSON.parse(readFileSync(join(CODES, "cheat-codes.json"), "utf8"));
eq(codes.groups.flatMap((g) => g.codes).length, 56, "les 56 codes sont tous dans la sauvegarde");
for (const trace of ["cheat-codes", "codesData", "allCodes", "onceCodes", "codesUsed",
                     "btn-codes", "codes-list", "capsule-override.codes.v1"]) {
  ok(!app.includes(trace), `l'app ne parle plus de ${trace}`);
  ok(!html.includes(trace), `la page non plus (${trace})`);
}
ok(!sw.includes("cheat-codes"), "le service worker ne le precache plus");
ok(!/\.code-row|\.code-check|\.codes-group/.test(css), "les styles de la liste sont partis avec elle");
/* La pastille du bouton comptait les pieces derriere un code. Elle doit
   compter autre chose de vrai, pas disparaitre a moitie. */
ok(app.includes("todoPlan().toMaster.length"), "la pastille du plan compte ce qui attend une extraction");
ok(!app.includes("plan.lobby") && !app.includes("plan.spare"),
   "le plan d'action n'a plus de section de codes");

/* ---- annonce ---- */
if (/^\d{4}-\d{2}-\d{2}$/.test(sprites.news.version)) {
  ok(sprites.news.version <= sprites.updatedAt,
     `la version d'annonce (${sprites.news.version}) ne devance pas le releve`);
} else {
  ok(/^\d{4}-\d{2}-\d{2}-/.test(sprites.news.version), `version suffixee datee (${sprites.news.version})`);
}
ok(sprites.news.lines.length >= 3, "l'annonce a du contenu");
ok(!sprites.news.lines.some((l) => /[<>]/.test(l)), "l'annonce reste du texte");
/* L'annonce doit nommer ce qui a change depuis le releve precedent — une
   fiche qui apparait sans explication ressemble a un bug — et dire ce que
   l'app ne sait pas, parce que c'est la moitie de l'information. */
const annonce = sprites.news.lines.join(" ");
ok(/Snail|escargot/i.test(annonce), "l'annonce nomme ce qui vient d'entrer");
ok(/conteste|contredit|non confirme|a relever/i.test(annonce),
   "et dit ce qui reste incertain");
ok(new RegExp(`${pieces}\\b`).test(annonce), "et annonce le nouveau total de pieces");

fin();
