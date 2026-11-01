/* La bande perforee de la vue Liste. Deux commandes pour la meme valeur :
   tout l'interet est qu'elles ne divergent jamais, et que les filtres
   continuent de compter sur les lignes du tableau meme quand celui-ci ne
   s'affiche plus. */
import { boot, lire, compteur, CLEF } from "./dom.mjs";

const { ok, eq, fin } = compteur();
const season = lire("sprites.json");
const override = lire("sprites-override.json");

/* Une case par ligne de variante, dans l'ordre du catalogue. La saison en
   cours ouvre sans illustrations — la wiki ne les a pas encore publiees — donc
   c'est le repli par le mot qui est a l'ecran, et c'est lui qu'on verifie ici
   sur le vrai catalogue plutot que sur une fiche retouchee. */
{
  const { document } = await boot();
  const toutes = season.sprites.find((s) => s.released
    && (s.variants || season.variants.map((v) => v.id)).length === season.variants.length);
  const card = document.querySelector(`.card[data-sprite="${toutes.id}"]`);
  const cells = [...card.querySelectorAll(".pcell")];
  eq(cells.length, season.variants.length, "une case par ligne de variante");
  eq(cells.map((c) => c.dataset.v).join(","), season.variants.map((v) => v.id).join(","),
     "les cases suivent l'ordre du catalogue");

  // Jamais une case vide : sans vignette ni mot, on ne saurait plus de quelle
  // ligne il s'agit. Et le mot doit tenir en un mot, sinon la case deborde.
  for (const c of document.querySelectorAll("#grid .pcell")) {
    const img = c.querySelector("img.pvicon"), mot = c.querySelector(".pword");
    ok(!!img !== !!mot, `${c.dataset.s}/${c.dataset.v} : une vignette ou un mot, pas les deux`);
    if (mot) eq(mot.textContent.includes(" "), false, `${c.dataset.v} : le repli tient en un mot`);
  }
  for (const c of cells) {
    eq(c.dataset.val, "0", `${c.dataset.v} part a vide`);
    ok(c.getAttribute("aria-label").includes("pas obtenue"),
       `${c.dataset.v} annonce son etat a la voix`);
  }

  /* Sweet Dreams n'a que sa forme de base : sa bande n'a qu'une case. */
  const seul = season.sprites.find((s) => Array.isArray(s.variants) && s.variants.length === 1);
  ok(seul, "un esprit sans variante existe bien dans le catalogue");
  if (seul) {
    const b = document.querySelector(`.card[data-sprite="${seul.id}"] .punch`);
    eq(b.querySelectorAll(".pcell").length, 1, `${seul.id} n'expose que sa ligne`);
  }
}

/* Le repli par le mot. Depuis que les illustrations de la saison sont
   arrivees, plus aucune fiche n'est dans ce cas : le catalogue est donc
   retouche a la volee. Le repli doit marcher le jour ou Epic annonce un
   esprit avant qu'une image existe — c'etait l'etat de la saison entiere le
   matin du 1er novembre. */
{
  const { document } = await boot({
    mutate: (cat) => {
      const s = cat.sprites.find((x) => x.released);
      delete s.icon;
      delete s.variantIcons;
      s.id = "sans-image";
      cat.order = [...cat.order];
      cat.order.unshift("sans-image");
    },
  });
  const cells = [...document.querySelectorAll('.card[data-sprite="sans-image"] .pcell')];
  ok(cells.length > 0, "la fiche sans image a bien sa bande");
  for (const c of cells) {
    ok(!c.querySelector("img.pvicon"), `${c.dataset.v} : pas d'image a montrer`);
    const mot = c.querySelector(".pword");
    ok(mot && mot.textContent.trim().length > 0, `${c.dataset.v} : le mot sert de repli`);
    eq(mot.textContent.includes(" "), false, "le repli tient en un mot");
  }
}

/* L'autre moitie de la regle : des que les illustrations existent, elles
   prennent la place du mot. La saison en cours les a toutes depuis le
   1er novembre, et Override aussi — on verifie sur les deux. */
{
  const { document } = await boot();
  const sprite = season.sprites.find((s) => s.released && (s.variants || []).length > 1);
  const cells = [...document.querySelectorAll(`.card[data-sprite="${sprite.id}"] .pcell`)];
  eq(cells.filter((c) => c.querySelector("img.pvicon")).length, cells.length,
     "chaque case de la saison porte sa vignette");
  eq(cells[0].querySelector("img.pvicon").getAttribute("src"),
     `icons/sprites/${sprite.id}.png`, "la case Base reprend l'illustration de l'esprit");
  eq(cells[1].querySelector("img.pvicon").getAttribute("src"),
     `icons/variants/${sprite.id}-${sprite.variants[1]}.png`,
     "la case Fortune prend l'illustration de sa variante");
}

{
  const { document, click } = await boot();
  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  const sprite = override.sprites.find((s) => s.released
    && (s.variants || []).length === override.variants.length);
  const card = document.querySelector(`.card[data-sprite="${sprite.id}"]`);
  const cells = [...card.querySelectorAll(".pcell")];
  eq(cells.length, override.variants.length, "une case par ligne, dans l'archive aussi");
  eq(cells.filter((c) => c.querySelector("img.pvicon")).length, cells.length,
     "chaque case porte la vignette de sa variante");
  eq(cells[0].querySelector("img.pvicon").getAttribute("src"),
     `icons/sprites/${sprite.id}.png`, "la case Base reprend l'illustration de l'esprit");
  eq(cells[1].querySelector("img.pvicon").getAttribute("src"),
     `icons/variants/${sprite.id}-${override.variants[1].id}.png`,
     "la case suivante prend l'illustration de sa variante");
  ok(!cells[0].querySelector(".vicon"),
     "la vignette de la bande n'est pas celle du tableau : elle n'ouvre pas la visionneuse");
}

/* La case tourne : vide, debloquee, maitrisee, vide. */
{
  const { document, click, peek } = await boot();
  const sprite = season.sprites.find((s) => s.released);
  const card = document.querySelector(`.card[data-sprite="${sprite.id}"]`);
  const cell = card.querySelector(".pcell");
  const vid = cell.dataset.v;
  for (const attendu of ["1", "2", "0", "1"]) {
    click(cell);
    eq(cell.dataset.val, attendu, `la case tourne vers ${attendu}`);
  }
  eq(peek.state.entries[sprite.id]?.[vid], 1, "la valeur arrive bien dans le magasin");
}

/* Les deux commandes ecrivent la meme valeur : cocher dans le tableau doit
   repeindre la bande, et l'inverse. Sans cela on aurait deux verites. */
{
  const { document, click } = await boot();
  const sprite = season.sprites.find((s) => s.released);
  const card = document.querySelector(`.card[data-sprite="${sprite.id}"]`);
  const cell = card.querySelector(".pcell");
  const vid = cell.dataset.v;
  const togM = card.querySelector(`.tog.t-m[data-v="${vid}"]`);
  const togU = card.querySelector(`.tog.t-u[data-v="${vid}"]`);

  click(togM);
  eq(cell.dataset.val, "2", "maitrise au tableau : la case passe a l'or");
  ok(cell.getAttribute("aria-label").includes("maitrisee"), "et l'annonce suit");

  click(cell);
  eq(cell.dataset.val, "0", "la case repart a vide depuis l'or");
  eq(togM.getAttribute("aria-pressed"), "false", "le tableau suit : maitrise relache");
  eq(togU.getAttribute("aria-pressed"), "false", "le tableau suit : debloque relache");

  click(cell);
  eq(togU.getAttribute("aria-pressed"), "true", "debloque au tableau apres un tour");
  eq(togM.getAttribute("aria-pressed"), "false", "mais pas maitrise");
}

/* Un filtre de piece efface les cases hors sujet sans les retirer : la bande
   se lit par ses positions, une bande qui retrecit ne dit plus laquelle manque. */
{
  const sprite = season.sprites.find((s) => s.released);
  const vars = sprite.variants || season.variants.map((v) => v.id);
  // Une piece debloquee, une maitrisee, le reste a vide : les trois etats a
  // la fois, pour que chaque filtre ait quelque chose a retenir et a ecarter.
  const store = { entries: { [sprite.id]: { [vars[0]]: 1, [vars[1]]: 2 } } };
  const { document, setFilter } = await boot({
    store: { [CLEF]: JSON.stringify(store) } });
  const card = document.querySelector(`.card[data-sprite="${sprite.id}"]`);
  const off = () => [...card.querySelectorAll(".pcell")]
    .filter((c) => c.classList.contains("is-off")).map((c) => c.dataset.v);

  eq(card.querySelectorAll(".pcell").length, vars.length, "toutes les cases sont la");
  eq(off().length, 0, "sans filtre, aucune case effacee");

  setFilter("missing");
  eq(card.querySelectorAll(".pcell").length, vars.length, "et elles y restent toutes");
  eq(off().sort().join(","), [vars[0], vars[1]].sort().join(","),
     "Manquants : les deux pieces acquises s'effacent");

  setFilter("unlocked");
  eq(off().includes(vars[0]), false, "A maitriser : la piece debloquee reste nette");
  eq(off().length, vars.length - 1, "les autres s'effacent, maitrisee comprise");

  setFilter("all");
  eq(off().length, 0, "retour a Tout : plus rien d'efface");
}

/* Le compte de pieces s'appuie sur les lignes du tableau. Elles ne
   s'affichent plus en vue Liste, elles doivent rester dans la carte. */
{
  const { document, click } = await boot();
  const sprite = season.sprites.find((s) => s.released);
  const card = document.querySelector(`.card[data-sprite="${sprite.id}"]`);
  ok(card.querySelectorAll(".vrow").length > 0, "les lignes survivent a la bande");

  // Les vignettes du tableau se verifient la ou les images existent : la
  // saison en cours attend encore les siennes.
  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  const vieux = override.sprites.find((s) => s.released && s.icon);
  const archive = document.querySelector(`.card[data-sprite="${vieux.id}"]`);
  ok(archive.querySelectorAll(".vrow").length > 0, "les lignes de l'archive aussi");
  ok(archive.querySelectorAll(".vrow .vicon").length > 0, "et elles gardent leurs vignettes");
}

/* La feuille de style doit bien separer les deux vues, sinon les deux
   commandes s'afficheraient en meme temps. */
{
  const css = (await import("node:fs")).readFileSync(
    new URL("../public/styles.css", import.meta.url), "utf8");
  ok(css.includes(".punch{display:none"), "la bande est cachee par defaut");
  ok(css.includes(".grid.is-list .punch{display:flex}"), "elle n'apparait qu'en vue Liste");
  ok(css.includes(".grid.is-list .vrow{display:none}"), "et le tableau s'efface alors");
}

fin();
