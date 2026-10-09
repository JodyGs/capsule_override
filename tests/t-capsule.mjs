/* La capsule : les deux anneaux, le centre, la regle de la saison, et les
   trois ambiances. Les arcs sont la seule piece de l'app ou une donnee se
   traduit en geometrie — un rayon change dans le balisage et plus rien ne
   correspond, sans que rien ne casse visiblement. */
import { boot, lire, compteur } from "./dom.mjs";

const { ok, eq, fin } = compteur();
const season = lire("sprites.json");
const TOUR_U = 2 * Math.PI * 70;
const TOUR_M = 2 * Math.PI * 56;

/* Les rayons du SVG doivent rester ceux que le script calcule. */
{
  const { document } = await boot();
  const r = (id) => Number(document.getElementById(id).getAttribute("r"));
  eq(r("dial-u"), 70, "rayon de l'anneau exterieur");
  eq(r("dial-m"), 56, "rayon de l'anneau interieur");
  const pistes = document.querySelectorAll(".dial-track");
  eq(pistes.length, 2, "une piste grise par anneau");
  eq(Number(pistes[0].getAttribute("r")), 70, "piste exterieure au bon rayon");
  eq(Number(pistes[1].getAttribute("r")), 56, "piste interieure au bon rayon");
}

/* Collection vide : les deux arcs sont a zero, pas absents. */
{
  const { document } = await boot();
  const part = (id) => {
    const d = document.getElementById(id).style.strokeDasharray;
    ok(/^[\d.]+ [\d.]+$/.test(d), `${id} : deux longueurs, obtenu ${JSON.stringify(d)}`);
    const [vu, tour] = d.split(" ").map(Number);
    return { vu, tour };
  };
  const u = part("dial-u"), m = part("dial-m");
  eq(u.vu, 0, "aucune piece debloquee : arc exterieur nul");
  eq(document.getElementById("dial-u").style.strokeLinecap, "butt",
     "a zero, pas de bout arrondi : un point se lirait comme une prise");
  eq(m.vu, 0, "aucune piece maitrisee : arc interieur nul");
  ok(Math.abs(u.tour - TOUR_U) < 0.01, "tour exterieur = perimetre de r=70");
  ok(Math.abs(m.tour - TOUR_M) < 0.01, "tour interieur = perimetre de r=56");
}

/* Un esprit entierement maitrise : les deux arcs avancent, et l'exterieur
   est toujours au moins aussi long que l'interieur — les maitrises sont un
   sous-ensemble des debloques, l'inclusion doit se voir. */
{
  const sprite = season.sprites.find((s) => s.released);
  const pieces = (sprite.variants || season.variants.map((v) => v.id)).length;
  const slot = {};
  for (const v of (sprite.variants || season.variants.map((x) => x.id))) slot[v] = 2;
  const store = { entries: { [sprite.id]: slot } };
  const { document, peek } = await boot({ store: { "capsule-override.store.v4": JSON.stringify(store) } });
  const denom = peek.state.denom;
  const lu = (id) => Number(document.getElementById(id).style.strokeDasharray.split(" ")[0]);
  const attendu = (pieces / denom) * TOUR_U;
  ok(Math.abs(lu("dial-u") - attendu) < 0.02, `arc exterieur a ${pieces}/${denom}`);
  ok(Math.abs(lu("dial-m") - (pieces / denom) * TOUR_M) < 0.02, `arc interieur a ${pieces}/${denom}`);
  ok(lu("dial-u") / TOUR_U >= lu("dial-m") / TOUR_M, "l'exterieur ne recule jamais sous l'interieur");
  eq(document.getElementById("s-pct").firstChild.nodeValue,
     String(Math.round((pieces / denom) * 100)), "le pourcentage suit l'anneau interieur");
}

/* Le centre du cadran pendant la saison. */
{
  const { document } = await boot({ at: Date.UTC(2026, 9, 9, 12, 0) });
  eq(document.getElementById("capsule-k").textContent, "Fin du passe", "libelle du centre");
  ok(/^\d+ j/.test(document.getElementById("deadline-v").textContent),
     `le centre compte les jours, obtenu ${document.getElementById("deadline-v").textContent}`);
  const sous = document.getElementById("deadline-sub").textContent;
  ok(sous.includes("nov."), `date courte sous le rebours, obtenu ${JSON.stringify(sous)}`);
  ok(!sous.includes("\n") && sous.length <= 16, `la date tient dans le disque (${sous.length} signes)`);
  ok(document.getElementById("deadline-note").textContent.includes("1er novembre"),
     "la date longue reste sous la capsule");
  eq(document.getElementById("pass").hidden, false, "la regle de saison est visible");
  const marque = document.getElementById("pass-b").textContent;
  ok(/^jour \d+$/.test(marque), `le jour present est marque, obtenu ${JSON.stringify(marque)}`);
  ok(document.getElementById("pass-a").textContent.length > 0, "le depart est date");
  ok(document.getElementById("pass-c").textContent.length > 0, "l'echeance est datee");
  const rempli = document.getElementById("deadline-fill").style.width;
  ok(/^\d+%$/.test(rempli) && Number(rempli.slice(0, -1)) > 0, `la regle est entamee (${rempli})`);
}

/* Trois jours avant : alerte. Apres : le centre s'eteint, la capsule reste. */
{
  const avant = await boot({ at: Date.UTC(2026, 9, 30, 12, 0) });
  eq(avant.document.getElementById("capsule").dataset.soon, "true", "sous trois jours : alerte");
  eq(avant.document.getElementById("capsule").dataset.over, "false", "pas encore termine");

  const apres = await boot({ at: Date.UTC(2026, 10, 3, 12, 0) });
  const box = apres.document.getElementById("capsule");
  eq(box.dataset.over, "true", "apres l'echeance : eteint");
  eq(box.dataset.soon, "false", "plus rien a courir, plus d'alerte");
  eq(apres.document.getElementById("deadline-v").textContent, "Saison terminee", "le centre le dit");
  ok(!box.hidden, "la capsule reste : les anneaux comptent toujours");
}

/* Legacy : pas d'echeance. Le centre ne doit pas afficher un rebours arrete,
   et la regle de saison n'a plus de sens. */
{
  const { document, click } = await boot();
  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  eq(document.getElementById("capsule-k").textContent, "Archive", "libelle d'archive");
  eq(document.getElementById("deadline-v").textContent, "Saison close", "pas de rebours en archive");
  eq(document.getElementById("pass").hidden, true, "pas de regle de saison en archive");
  eq(document.getElementById("console").hidden, false, "les anneaux comptent encore en archive");
  ok(document.body.classList.contains("is-legacy"), "l'ambiance patine est posee");
}

/* Family : galerie. Rien a compter, donc pas de capsule du tout. */
{
  const { document, click } = await boot();
  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  ok(document.body.classList.contains("is-gallery"), "l'ambiance Family est posee");
  eq(document.getElementById("console").hidden, true, "pas de compteurs dans une galerie");
}

/* La feuille de style doit porter les trois ambiances, dans les trois
   palettes : un jeton defini une seule fois disparait en mode sombre. */
{
  const css = (await import("node:fs")).readFileSync(
    new URL("../public/styles.css", import.meta.url), "utf8");
  for (const jeton of ["--patina", "--patina-veil", "--bloom", "--bloom-veil"]) {
    eq((css.match(new RegExp(`${jeton}:`, "g")) || []).length, 3, `${jeton} defini dans les trois palettes`);
  }
  ok(css.includes("body.is-legacy{--mood:var(--patina)"), "Legacy prend la patine");
  ok(css.includes("--accent:var(--bloom)"), "Family prend le rose a la place de l'accent");
  ok(!/body\.is-legacy\{[^}]*--accent:/.test(css),
     "Legacy garde son accent : le cyan et l'or y portent une information");
  ok(css.includes("--bg-veil") === false, "plus de jeton mort --bg-veil");
}

fin();
