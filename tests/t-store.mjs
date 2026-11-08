/* Les coches ne vont jamais dans la mauvaise saison.
   Deux chemins effacaient l'archive Override : cocher puis changer de
   collection pendant que le catalogue suivant se chargeait, et changer de
   collection hors ligne quand ce chargement echouait. Dans les deux cas
   l'ecriture differee relisait la clef de la collection ouverte entre-temps. */
import { boot, compteur, CLEF } from "./dom.mjs";

const { ok, eq, fin } = compteur();
const OV = "capsule-override.store.v4";
const RN = "capsule-override.legacy.v1";
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const archive = JSON.stringify({ v: 4, entries: { jonesy: { base: 2, gold: 2 }, bush: { base: 1 } } });
const runners = JSON.stringify({ v: 4, entries: { "l-earth": { base: 2 } } });
const entrees = (memory, k) => JSON.parse(memory[k] || "{}").entries;

/* Cocher, puis changer de collection pendant un chargement lent. */
{
  const { document, memory, click } = await boot({ store: { [OV]: archive } });
  const reel = globalThis.fetch;
  globalThis.fetch = async (u) => { await attendre(400); return reel(u); };
  click(document.querySelector('.tog[data-s="t-repete"][data-v="base"][data-lvl="1"]'));
  click(document.getElementById("btn-legacy"));
  await attendre(700);
  eq(JSON.stringify(entrees(memory, OV)), JSON.stringify(JSON.parse(archive).entries),
     "l'archive Override n'est pas ecrasee par une coche de la saison en cours");
  eq(entrees(memory, CLEF)?.["t-repete"]?.base, 1, "la coche est arrivee dans sa propre saison");
}

/* Changer de collection hors ligne, puis cocher. */
{
  const { document, memory, click, peek } = await boot({ store: { [OV]: archive } });
  globalThis.fetch = async () => { throw new Error("hors ligne"); };
  click(document.getElementById("btn-legacy"));
  await attendre(50);
  eq(peek.state.which, "current", "un chargement rate laisse la collection ouverte en place");
  click(document.querySelector('.tog[data-s="t-barry"][data-v="base"][data-lvl="2"]'));
  await attendre(400);
  eq(memory[OV], archive, "l'archive reste intacte");
  eq(entrees(memory, CLEF)?.["t-barry"]?.base, 2, "la coche va a la saison affichee");
}

/* Faire le tour des trois collections ne modifie aucune progression. */
{
  const actuelle = JSON.stringify({ v: 4, entries: { "t-halfpeeld": { base: 2, fortune: 1 } } });
  const { document, memory, click } = await boot({ store: { [CLEF]: actuelle, [OV]: archive, [RN]: runners } });
  for (let i = 0; i < 3; i += 1) { click(document.getElementById("btn-legacy")); await attendre(40); }
  eq(memory[CLEF], actuelle, "saison en cours intacte apres un tour complet");
  eq(memory[OV], archive, "Override intacte apres un tour complet");
  eq(memory[RN], runners, "Runners intacte apres un tour complet");
}

/* Une coche de la derniere seconde est ecrite quand l'app passe en arriere-plan. */
{
  const { document, memory, click, window } = await boot();
  click(document.querySelector('.tog[data-s="t-kelper"][data-v="base"][data-lvl="1"]'));
  window.dispatchEvent(new window.Event("pagehide"));
  eq(entrees(memory, CLEF)?.["t-kelper"]?.base, 1, "ecrite sans attendre le delai");
}

/* Effacer annule une ecriture en attente : rien ne ressuscite. */
{
  const actuelle = JSON.stringify({ v: 4, entries: { "t-halfpeeld": { base: 2 } } });
  const { document, memory, click } = await boot({ store: { [CLEF]: actuelle } });
  globalThis.confirm = () => true;
  click(document.querySelector('.tog[data-s="t-kelper"][data-v="base"][data-lvl="1"]'));
  click(document.getElementById("btn-wipe"));
  await attendre(400);
  ok(!(CLEF in memory), "apres Tout effacer, la clef reste vide");
}

/* Un esprit pas encore sorti ne se coche pas, et ne compte pas comme manquant.
   Une coche posee par une version precedente reste stockee. */
{
  // Un esprit fictif, injecte : le test ne depend pas de ce que la saison a
  // d'a venir au moment ou il tourne.
  const avant = JSON.stringify({ v: 4, entries: { "t-test-avenir": { base: 2 } } });
  const mutate = (cat) => cat.sprites.push({ ...cat.sprites[0], id: "t-test-avenir", name: "Test a venir",
    released: false, releasesOn: "2099-01-01", icon: false, variantIcons: [] });
  const { document, memory, click, setFilter, visibleCards, peek } = await boot({ store: { [CLEF]: avant }, mutate });
  const pasSorti = peek.state.catalogue.sprites.find((s) => !s.released);
  ok(pasSorti, "l'esprit a venir est bien dans le catalogue");
  {
    const boutons = [...document.querySelectorAll(`.card[data-sprite="${pasSorti.id}"] .tog, .card[data-sprite="${pasSorti.id}"] .pcell`)];
    ok(boutons.length && boutons.every((b) => b.disabled), "ses cases sont inactives");
    click(document.querySelector(`.tog[data-s="${pasSorti.id}"][data-lvl="1"]`));
    await attendre(300);
    setFilter("missing");
    ok(!visibleCards().some((c) => c.dataset.sprite === pasSorti.id), "il n'est pas dans Manquants");
    setFilter("soon");
    ok(visibleCards().some((c) => c.dataset.sprite === pasSorti.id), "il reste dans A venir");
  }
  eq(memory[CLEF], avant, "la coche d'avant n'est ni effacee ni modifiee");
}

/* Une sauvegarde ne fait entrer que les variantes que l'esprit possede. */
{
  const { document, memory, click } = await boot();
  globalThis.confirm = () => true;
  click(document.getElementById("btn-paste"));
  document.getElementById("paste-input").value = JSON.stringify({
    entries: { "t-sweetdreams": { base: 2, fortune: 2 }, "t-repete": { cursed: 1 } } });
  click(document.getElementById("btn-paste-import"));
  const e = entrees(memory, CLEF);
  eq(e?.["t-sweetdreams"]?.base, 2, "la base de Doux reves est reprise");
  eq(e?.["t-sweetdreams"]?.fortune, undefined, "sa Fortune inexistante est ecartee");
  eq(e?.["t-repete"]?.cursed, 1, "une variante reelle passe");
}

fin();
