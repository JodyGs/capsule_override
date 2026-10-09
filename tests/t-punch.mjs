/* La bande perforee de la vue Liste. Deux commandes pour la meme valeur :
   tout l'interet est qu'elles ne divergent jamais, et que les filtres
   continuent de compter sur les lignes du tableau meme quand celui-ci ne
   s'affiche plus. */
import { boot, lire, compteur } from "./dom.mjs";

const { ok, eq, fin } = compteur();
const season = lire("sprites.json");

/* Une case par ligne de variante, dans l'ordre du catalogue. */
{
  const { document } = await boot();
  const sprite = season.sprites.find((s) => s.released
    && (s.variants || season.variants.map((v) => v.id)).length === season.variants.length);
  const card = document.querySelector(`.card[data-sprite="${sprite.id}"]`);
  const cells = [...card.querySelectorAll(".pcell")];
  eq(cells.length, season.variants.length, "une case par ligne de variante");
  eq(cells.map((c) => c.dataset.v).join(","), season.variants.map((v) => v.id).join(","),
     "les cases suivent l'ordre du catalogue");
  // Au centre de chaque case, l'illustration de la variante — c'est ce qui
  // permet a la vue Liste de rester lisible sans ecrire les noms.
  eq(cells.filter((c) => c.querySelector("img.pvicon")).length, cells.length,
     "chaque case porte la vignette de sa variante");
  eq(cells[0].querySelector("img.pvicon").getAttribute("src"),
     `icons/sprites/${sprite.id}.png`, "la case Base reprend l'illustration de l'esprit");
  eq(cells[1].querySelector("img.pvicon").getAttribute("src"),
     `icons/variants/${sprite.id}-gold.png`, "la case Or prend l'illustration doree");
  ok(!cells[0].querySelector(".vicon"),
     "la vignette de la bande n'est pas celle du tableau : elle n'ouvre pas la visionneuse");

  // Pas d'illustration — un esprit pas encore sorti — le mot reprend la place.
  // Jamais une case vide : on ne saurait plus de quelle ligne il s'agit.
  let repli = 0;
  for (const c of document.querySelectorAll("#grid .pcell")) {
    const img = c.querySelector("img.pvicon"), mot = c.querySelector(".pword");
    ok(!!img !== !!mot, `${c.dataset.s}/${c.dataset.v} : une vignette ou un mot, pas les deux`);
    if (mot) {
      repli += 1;
      eq(mot.textContent, mot.textContent.split(" ")[0], "le repli est un seul mot");
    }
  }
  ok(repli > 0, "les esprits sans illustration retombent bien sur le mot");
  for (const c of cells) {
    eq(c.dataset.val, "0", `${c.dataset.v} part a vide`);
    ok(c.getAttribute("aria-label").includes("pas obtenue"),
       `${c.dataset.v} annonce son etat a la voix`);
  }

  /* Mega Man n'a qu'une ligne : sa bande n'a qu'une case. */
  const seul = season.sprites.find((s) => Array.isArray(s.variants) && s.variants.length === 1);
  if (seul) {
    const b = document.querySelector(`.card[data-sprite="${seul.id}"] .punch`);
    eq(b.querySelectorAll(".pcell").length, 1, `${seul.id} n'expose que sa ligne`);
  }
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
    store: { "capsule-override.store.v4": JSON.stringify(store) } });
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
  const { document } = await boot();
  const sprite = season.sprites.find((s) => s.released);
  const card = document.querySelector(`.card[data-sprite="${sprite.id}"]`);
  ok(card.querySelectorAll(".vrow").length > 0, "les lignes survivent a la bande");
  ok(card.querySelectorAll(".vrow .vicon").length > 0, "et gardent leurs vignettes");
}

/* Une galerie ne coche rien : pas de bande non plus. */
{
  const { document, click } = await boot();
  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  eq(document.querySelectorAll("#grid .pcell").length, 0, "aucune case dans Family");
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
