/* Lance tous les fichiers de test et additionne leurs comptes. */
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const ici = dirname(fileURLToPath(import.meta.url));
const fichiers = readdirSync(ici).filter((f) => f.startsWith("t-") && f.endsWith(".mjs")).sort();
let total = 0, casse = 0;
for (const f of fichiers) {
  const r = spawnSync(process.execPath, [join(ici, f)], { encoding: "utf8" });
  const sortie = (r.stdout || "") + (r.stderr || "");
  const m = sortie.match(/(\d+) verifications passees, (\d+) echouees/);
  const nom = f.replace(/\.mjs$/, "").padEnd(12);
  if (!m) { console.log(`${nom} ECHEC\n${sortie.trim().split("\n").slice(-6).join("\n")}`); casse += 1; continue; }
  total += Number(m[1]);
  casse += Number(m[2]);
  console.log(`${nom} ${m[1]} passees${m[2] === "0" ? "" : `, ${m[2]} ECHOUEES`}`);
  if (m[2] !== "0") console.log(sortie.split("\n").filter((l) => l.includes("FAIL")).join("\n"));
}
console.log(`${"".padEnd(12)} ─── ${total} verifications, ${casse} en echec`);
process.exit(casse ? 1 : 0);
