/* La galerie Family. Rien ne s'y coche et rien ne s'y compte : ce qui s'y
   verifie, c'est qu'aucune commande de pointage n'a fuite dedans, et que le
   pliage des fiches n'en laisse jamais deux ouvertes. */
import { boot, lire, compteur } from "./dom.mjs";

const { ok, eq, fin } = compteur();
const famille = lire("sprites-family.json");

async function galerie() {
  const b = await boot();
  b.click(b.document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  b.click(b.document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  return b;
}

/* Une fiche par esprit, dans l'ordre du catalogue, repliee au depart. */
{
  const { document } = await galerie();
  const cartes = [...document.querySelectorAll("#grid .card")];
  eq(cartes.length, famille.sprites.length, "une fiche par esprit de la famille");
  eq(cartes.map((c) => c.dataset.sprite).join(","), famille.order.join(","),
     "les fiches suivent l'ordre du catalogue");
  eq(cartes.filter((c) => c.classList.contains("is-open")).length, 0,
     "tout est replie a l'ouverture : on choisit qui lire");

  for (const carte of cartes) {
    const tete = carte.querySelector(".card-top");
    eq(tete.getAttribute("role"), "button", `${carte.dataset.sprite} : en-tete annonce en bouton`);
    eq(tete.getAttribute("tabindex"), "0", `${carte.dataset.sprite} : atteignable au clavier`);
    eq(tete.getAttribute("aria-expanded"), "false", `${carte.dataset.sprite} : annonce replie`);
    eq(tete.getAttribute("aria-controls"), `fold-${carte.dataset.sprite}`,
       `${carte.dataset.sprite} : l'en-tete designe son volet`);
    ok(carte.querySelector(`#fold-${carte.dataset.sprite} .effect`),
       `${carte.dataset.sprite} : l'effet est dans le volet`);
    ok(carte.querySelector(".fold .src"), `${carte.dataset.sprite} : le comment aussi`);
    ok(carte.querySelector(".fold-mark"), `${carte.dataset.sprite} : un chevron le signale`);
  }
}

/* Un seul volet ouvert a la fois. */
{
  const { document, click } = await galerie();
  const cartes = [...document.querySelectorAll("#grid .card")];
  const ouvertes = () => cartes.filter((c) => c.classList.contains("is-open")).map((c) => c.dataset.sprite);
  const tete = (c) => c.querySelector(".card-top");

  click(tete(cartes[0]));
  eq(ouvertes().join(","), cartes[0].dataset.sprite, "la premiere s'ouvre");
  eq(tete(cartes[0]).getAttribute("aria-expanded"), "true", "et l'annonce");

  click(tete(cartes[3]));
  eq(ouvertes().join(","), cartes[3].dataset.sprite, "la quatrieme s'ouvre, la premiere se ferme");
  eq(tete(cartes[0]).getAttribute("aria-expanded"), "false", "la premiere annonce qu'elle s'est fermee");

  click(tete(cartes[3]));
  eq(ouvertes().length, 0, "un second clic referme");

  // Le corps de la fiche plie aussi : la zone est large, on n'a pas a viser.
  click(cartes[5].querySelector(".effect"));
  eq(ouvertes().join(","), cartes[5].dataset.sprite, "cliquer le texte plie la fiche");
}

/* La photo garde son role : elle ouvre la visionneuse, elle ne plie pas. */
{
  const { document, click } = await galerie();
  const carte = document.querySelector("#grid .card");
  click(carte.querySelector(".sprite-icon"));
  eq(carte.classList.contains("is-open"), false, "la photo n'a pas plie la fiche");
  eq(document.getElementById("zoom").open, true, "elle a ouvert la visionneuse");
}

/* Le clavier : Entree et Espace sur l'en-tete. */
{
  const { document, window } = await galerie();
  const carte = document.querySelector("#grid .card");
  const tete = carte.querySelector(".card-top");
  for (const key of ["Enter", " "]) {
    const avant = carte.classList.contains("is-open");
    // linkedom n'a pas de KeyboardEvent : un Event porteur de la touche suffit,
    // c'est tout ce que le gestionnaire lit.
    const ev = new window.Event("keydown", { bubbles: true });
    ev.key = key;
    tete.dispatchEvent(ev);
    eq(carte.classList.contains("is-open"), !avant, `${key} bascule le volet`);
  }
}

/* Le compte ne parle pas de saison : il n'y en a pas ici. */
{
  const { document } = await galerie();
  eq(document.getElementById("count").textContent, `${famille.sprites.length} fiches`,
     "le compte dit ce qu'il y a a lire");
}

/* Rien a pointer : aucune case, aucune bande, aucun compteur. */
{
  const { document } = await galerie();
  eq(document.querySelectorAll("#grid .tog").length, 0, "aucune coche");
  eq(document.querySelectorAll("#grid .pcell").length, 0, "aucune case de bande");
  eq(document.querySelectorAll("#grid .vt").length, 0, "aucun tableau de variantes");
  eq(document.getElementById("console").hidden, true, "aucun compteur");
}

/* Le pliage ne vaut que pour la galerie : ailleurs, tout reste lisible. */
{
  const { document } = await boot();
  eq(document.querySelectorAll("#grid .fold").length, 0, "pas de volet dans la saison en cours");
  eq(document.querySelectorAll("#grid .card-top[role='button']").length, 0,
     "ni d'en-tete cliquable");
  const carte = document.querySelector("#grid .card");
  ok(carte.querySelector(".effect"), "l'effet s'affiche sans qu'on ait a deplier");
}

fin();
