/* La capsule : les deux anneaux, le centre, la regle de la saison, et les
   trois ambiances. Les arcs sont la seule piece de l'app ou une donnee se
   traduit en geometrie — un rayon change dans le balisage et plus rien ne
   correspond, sans que rien ne casse visiblement. */
import { boot, lire, compteur, CLEF } from "./dom.mjs";

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
  const { document, peek } = await boot({ store: { [CLEF]: JSON.stringify(store) } });
  const denom = peek.state.denom;
  const lu = (id) => Number(document.getElementById(id).style.strokeDasharray.split(" ")[0]);
  const attendu = (pieces / denom) * TOUR_U;
  ok(Math.abs(lu("dial-u") - attendu) < 0.02, `arc exterieur a ${pieces}/${denom}`);
  ok(Math.abs(lu("dial-m") - (pieces / denom) * TOUR_M) < 0.02, `arc interieur a ${pieces}/${denom}`);
  ok(lu("dial-u") / TOUR_U >= lu("dial-m") / TOUR_M - 1e-4,
     "l'exterieur ne recule jamais sous l'interieur, a l'arrondi du trait pres");
  eq(document.getElementById("s-pct").firstChild.nodeValue,
     String(Math.round((pieces / denom) * 100)), "le pourcentage suit l'anneau interieur");
}

/* Le centre du cadran pendant la saison. */
{
  const { document } = await boot({ at: Date.UTC(2026, 10, 10, 12, 0) });
  eq(document.getElementById("capsule-k").textContent, "Fin du passe", "libelle du centre");
  ok(/^\d+ j/.test(document.getElementById("deadline-v").textContent),
     `le centre compte les jours, obtenu ${document.getElementById("deadline-v").textContent}`);
  const sous = document.getElementById("deadline-sub").textContent;
  ok(/5 d\u00e9c\./.test(sous), `date courte sous le rebours, obtenu ${JSON.stringify(sous)}`);
  ok(!sous.includes("\n") && sous.length <= 16, `la date tient dans le disque (${sous.length} signes)`);
  ok(document.getElementById("deadline-note").textContent.includes("5 d\u00e9cembre"),
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
  const avant = await boot({ at: Date.UTC(2026, 11, 3, 12, 0) });
  eq(avant.document.getElementById("capsule").dataset.soon, "true", "sous trois jours : alerte");
  eq(avant.document.getElementById("capsule").dataset.over, "false", "pas encore termine");

  const apres = await boot({ at: Date.UTC(2026, 11, 8, 12, 0) });
  const box = apres.document.getElementById("capsule");
  eq(box.dataset.over, "true", "apres l'echeance : eteint");
  eq(box.dataset.soon, "false", "plus rien a courir, plus d'alerte");
  eq(apres.document.getElementById("deadline-v").textContent, "Saison terminee", "le centre le dit");
  ok(!box.hidden, "la capsule reste : les anneaux comptent toujours");
}

/* Les archives : pas d'echeance. Le centre ne doit pas afficher un rebours
   arrete, et la regle de saison n'a plus de sens. Depuis le 1er novembre il y
   en a deux — Override et Runners — et le bouton passe par les deux avant de
   revenir a la saison en cours. Les deux doivent se comporter pareil : c'est
   la table des collections qui le dit, plus un nom de collection en dur. */
{
  const { document, click, peek } = await boot();
  const tour = async () => {
    click(document.getElementById("btn-legacy"));
    await new Promise((r) => setTimeout(r, 40));
  };
  for (const attendue of ["override", "legacy"]) {
    await tour();
    eq(peek.state.which, attendue, `le bouton mene a ${attendue}`);
    eq(document.getElementById("capsule-k").textContent, "Archive", `libelle d'archive (${attendue})`);
    eq(document.getElementById("deadline-v").textContent, "Saison close", `pas de rebours (${attendue})`);
    eq(document.getElementById("pass").hidden, true, `pas de regle de saison (${attendue})`);
    eq(document.getElementById("console").hidden, false, `les anneaux comptent encore (${attendue})`);
    ok(document.body.classList.contains("is-legacy"), `l'ambiance patine est posee (${attendue})`);
    // Une archive se complete encore : les coches ne sont pas gelees.
    ok(document.querySelectorAll("#grid .pcell").length > 0, `on coche encore dans ${attendue}`);
  }
  await tour();
  eq(peek.state.which, "current", "le troisieme clic ramene a la saison en cours");
  eq(document.getElementById("capsule-k").textContent, "Fin du passe", "et le rebours revient");
  ok(!document.body.classList.contains("is-legacy"), "l'ambiance patine est levee");
}

/* Plus aucune collection en lecture seule depuis que la galerie maison est
   sortie de public/. La mecanique reste dans l'app — elle resservira — mais
   aucune des trois collections ne doit l'enclencher. */
{
  const { document, click, peek } = await boot();
  for (let i = 0; i < 3; i += 1) {
    click(document.getElementById("btn-legacy"));
    await new Promise((r) => setTimeout(r, 40));
    ok(!document.body.classList.contains("is-gallery"), `aucune galerie sur ${peek.state.which}`);
    eq(document.getElementById("console").hidden, false, `les compteurs restent sur ${peek.state.which}`);
  }
}

/* Le detail par rarete ne montre que les raretes en jeu. Une saison sans
   rarete publiee n'a qu'une ligne — « A confirmer » — et surtout pas quatre
   paliers vides qui laisseraient croire qu'il n'y a rien a collectionner. */
{
  const { document, click, peek } = await boot();
  const lignes = () => [...document.querySelectorAll("#by-rarity .rr-k")]
    .map((e) => e.textContent.trim());
  const attendues = peek.state.catalogue.rarities
    .filter((r) => peek.state.live.some((s) => s.rarity === r.id))
    .map((r) => r.label);
  eq(lignes().join(","), attendues.join(","),
     "le detail liste les raretes en jeu, dans l'ordre du catalogue");
  ok(!lignes().some((l, i, t) => t.indexOf(l) !== i), "sans doublon");
  // Les lignes se partagent exactement le denominateur : une rarete oubliee
  // ou comptee deux fois se verrait ici et nulle part ailleurs.
  const somme = [...document.querySelectorAll("#by-rarity .rr-u")]
    .reduce((n, e) => n + Number(e.textContent.split("/")[1]), 0);
  eq(somme, peek.state.denom, "et elles se partagent toutes les pieces");

  click(document.getElementById("btn-legacy"));
  await new Promise((r) => setTimeout(r, 40));
  const archive = lignes();
  ok(archive.length > 1, `Override garde ses paliers, obtenu ${JSON.stringify(archive)}`);
  ok(archive.includes("A confirmer"), "y compris la rarete jamais communiquee d'Obsession");
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
  ok(css.includes("--accent:var(--bloom)"), "l'ambiance de galerie garde son rose, en attendant de reservir");
  ok(!/body\.is-legacy\{[^}]*--accent:/.test(css),
     "Legacy garde son accent : le cyan et l'or y portent une information");
  ok(css.includes("--bg-veil") === false, "plus de jeton mort --bg-veil");
}

fin();
