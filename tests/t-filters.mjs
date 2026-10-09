/* Les filtres. Deux regimes : sur grand ecran le panneau est toujours la,
   sur telephone il se replie derriere un bouton. Le piege est de confondre
   les deux — un attribut `hidden` pose pour la galerie avait fait disparaitre
   le panneau sur toutes les tailles, bouton compris. */
import { boot, lire, compteur } from "./dom.mjs";

const { ok, eq, fin } = compteur();
const season = lire("sprites.json");

/* Le panneau est servi visible : c'est le CSS, et lui seul, qui le replie
   sur telephone. Rien dans le script ne doit le masquer hors galerie. */
{
  const { document, click } = await boot();
  const panneau = document.getElementById("filter-panel");
  eq(panneau.hidden, false, "le panneau de filtres est la des l'ouverture");

  const bouton = document.getElementById("btn-filters");
  eq(bouton.getAttribute("aria-expanded"), "false", "le bouton part replie");
  click(bouton);
  eq(panneau.classList.contains("is-open"), true, "le bouton deplie");
  eq(bouton.getAttribute("aria-expanded"), "true", "et l'annonce");
  eq(panneau.hidden, false, "deplie, le panneau n'est pas masque");
  click(bouton);
  eq(panneau.classList.contains("is-open"), false, "un second clic replie");
  eq(panneau.hidden, false, "replie, c'est le CSS qui decide, pas l'attribut");
}

/* En galerie il n'y a rien a filtrer : le panneau et son bouton s'en vont. */
{
  const { document, click } = await boot();
  const panneau = document.getElementById("filter-panel");
  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  eq(panneau.hidden, false, "Legacy se filtre comme la saison en cours");

  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  eq(panneau.hidden, true, "Family : rien a filtrer");
  eq(document.getElementById("btn-filters").hidden, true, "ni bouton pour le rouvrir");

  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  eq(panneau.hidden, false, "de retour sur la saison en cours, le panneau revient");
}

/* Chaque filtre de statut retient ce qu'il annonce, et rien d'autre. */
{
  const sprite = season.sprites.find((s) => s.released);
  const vars = sprite.variants || season.variants.map((v) => v.id);
  const store = { entries: { [sprite.id]: Object.fromEntries(vars.map((v) => [v, 2])) } };
  const { document, setFilter, visibleCards, visibleRows } = await boot({
    store: { "capsule-override.store.v4": JSON.stringify(store) } });
  const carte = (id) => document.querySelector(`.card[data-sprite="${id}"]`);

  setFilter("mastered");
  eq(visibleCards().map((c) => c.dataset.sprite).join(","), sprite.id,
     "Maitrises ne garde que l'esprit entierement maitrise");

  setFilter("missing");
  ok(!visibleCards().some((c) => c.dataset.sprite === sprite.id),
     "Manquants ecarte l'esprit complet");
  for (const c of visibleCards()) {
    for (const row of visibleRows(c)) {
      eq(statusDansLeMagasin(c.dataset.sprite, row.dataset.variant, store), 0,
         `${c.dataset.sprite}/${row.dataset.variant} : seule une piece manquante reste`);
    }
  }

  setFilter("unlocked");
  eq(visibleCards().length, 0, "A maitriser : aucune piece n'est a ce stade");

  setFilter("all");
  eq(visibleCards().length, season.sprites.length, "Tout rend tout le monde");
  eq(visibleRows(carte(sprite.id)).length, vars.length, "et toutes les lignes avec");
}

function statusDansLeMagasin(spriteId, variantId, store) {
  return store.entries[spriteId]?.[variantId] || 0;
}

fin();
