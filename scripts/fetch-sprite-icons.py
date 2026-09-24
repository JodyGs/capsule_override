#!/usr/bin/env python3
"""
Recupere les icones d'esprits depuis la Fortnite Wiki (weirdgloop) et les
reduit au format utilise par l'app.

    python3 scripts/fetch-sprite-icons.py

A relancer quand Epic sort un nouvel esprit. Le script met a jour le champ
"icon" de public/sprites.json pour les esprits dont l'icone a ete trouvee,
et laisse les autres tels quels : l'app affiche alors une pastille de repli.

Les images appartiennent a Epic Games. Usage non commercial, dans le cadre
de la Fan Content Policy, avec attribution dans l'app.
"""
import io
import json
import os
import shutil
import ssl
import subprocess
import sys
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGUES = [
    os.path.join(ROOT, "public", "sprites.json"),
    os.path.join(ROOT, "public", "sprites-legacy.json"),
]
OUT_DIR = os.path.join(ROOT, "public", "icons", "sprites")
VARIANT_DIR = os.path.join(ROOT, "public", "icons", "variants")
SIZE = 288        # affiche jusqu'a 96 px, net sur les ecrans 3x
VARIANT_SIZE = 192  # vignette de 26 px en ligne, agrandissement jusqu'a 208 px

# Chaque variante a sa propre illustration sur la wiki, sous un prefixe
# a elle. Le mappage est explicite : mettre une majuscule a l'identifiant
# marcherait pour six lignes sur huit, et casserait sur « Cheat Master ».
VARIANT_PREFIX = {
    "gold": "Gold",
    "cheat": "Cheat_Master",
    "gummy": "Gummy",
    "galaxy": "Galaxy",
    "gem": "Gem",
    "holofoil": "Holofoil",
    "cube": "Cube",
    "quack": "Quack",
    "loot": "Loot_Hacker",
    "bounty": "Bounty_Hunter",
}
BASE = "https://fortnite.weirdgloop.org/images/"
UA = "capsule-override/1.0 (projet de fan, non commercial)"

# Le nom du fichier sur la wiki ne suit pas toujours l'identifiant interne.
WIKI_NAME = {
    "8bit": "8-Bit",
    "stormscout": "Storm_Scout",
    "bush": "Bush",
    "adventure": "Adventure",
    "jonesy": "Jonesy",
    "sonic": "Sonic",
    "tails": "Tails",
    "shadow": "Shadow",
    "killswitch": "Killswitch",
    "jackrabbit": "Jackrabbit",
    "klombo": "Klombo",
    "crown": "Crown",
    "dumpster": "Dumpster_Dive",
    "honey": "Honey",
    "pond": "Pond",
    "xray": "X-Ray",
    # v42.10 : Epic a echange le Bullet d'Enorull contre son Onigiri.
    "onigiri": "Onigiri",
    "overshield": "Overshield",
    "megaman": "Mega_Man",
    # v42.20
    "crash": "Crash_Bandicoot",
    "blinky": "Blinky",
    "morgana": "Morgana",

    # Chapitre 7 Saison 3 — Runners. Le prefixe « l- » evite toute collision
    # d'identifiant avec la saison en cours.
    "l-earth": "Earth", "l-fire": "Fire", "l-water": "Water",
    "l-fishy": "Fishy", "l-air": "Air",
    "l-duck": "Duck", "l-ghost": "Ghost", "l-demon": "Demon",
    "l-king": "King", "l-striker": "Striker",
    "l-aura": "Aura", "l-dream": "Dream", "l-punk": "Punk",
    "l-boss": "Boss", "l-seven": "Seven",
    "l-llama": "Lootin'_Llama", "l-peely": "Peeky_Peely",
    "l-zeropoint": "Zero_Point", "l-grim": "Grim",
    "l-burntpeanut": "TheBurntPeanut", "l-vinijr": "Vini_Jr.",
    "l-batman": "Batman", "l-pollo": "Pollo",
    "l-ironmouse": "Ironmouse", "l-johnwick": "John_Wick",
}


def _context():
    """Le Python livre avec macOS n'a pas de magasin de certificats."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return None


def square(raw, size):
    """Carre exact, sujet centre : les lignes de la liste restent alignees."""
    image = Image.open(io.BytesIO(raw)).convert("RGBA")
    image.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(image, ((size - image.width) // 2, (size - image.height) // 2), image)
    # Palette de 256 couleurs : quatre fois plus leger a telecharger,
    # sans difference visible sur ces aplats — verifie sur fond clair
    # et sur fond sombre avant d'etre adopte.
    return canvas.quantize(colors=256, method=Image.FASTOCTREE)


def fetch(name):
    filename = f"{name}_Sprite_-_Item_-_Fortnite.png"
    url = BASE + urllib.parse.quote(filename)

    context = _context()
    if context is not None:
        request = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(request, timeout=20, context=context) as response:
            return response.read()

    # Repli sur curl, qui a ses propres certificats.
    if not shutil.which("curl"):
        raise RuntimeError("ni certifi ni curl : impossible de telecharger")
    result = subprocess.run(
        ["curl", "-sSL", "--fail", "--max-time", "20", "-A", UA, url],
        capture_output=True, check=False
    )
    if result.returncode != 0 or not result.stdout:
        raise RuntimeError(f"curl a echoue ({result.returncode})")
    return result.stdout


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(VARIANT_DIR, exist_ok=True)
    total_found, total_missing, total_variants = [], [], []

    for path in CATALOGUES:
        with io.open(path, encoding="utf-8") as handle:
            catalogue = json.load(handle)

        label = os.path.basename(path)
        found, missing, variant_found = [], [], []
        for sprite in catalogue["sprites"]:
            wiki = WIKI_NAME.get(sprite["id"])
            if not wiki:
                missing.append((sprite["id"], "nom wiki inconnu"))
                sprite.pop("icon", None)
                continue
            try:
                raw = fetch(wiki)
                Image.open(io.BytesIO(raw)).convert("RGBA")   # fichier lisible ?
            except Exception as err:               # noqa: BLE001
                reason = "pas encore sorti" if "404" in str(err) or "22" in str(err) else type(err).__name__
                # Une coupure reseau ne doit pas effacer un catalogue juste.
                # Tant que le PNG est sur le disque, l'entree reste vraie : on
                # signale et on passe. Sans ce garde-fou, un timeout suffisait
                # a retirer un esprit de la collection de tout le monde.
                if os.path.exists(os.path.join(OUT_DIR, f"{sprite['id']}.png")):
                    missing.append((sprite["id"], f"{reason} — entree conservee, image deja presente"))
                    continue
                missing.append((sprite["id"], reason))
                sprite.pop("icon", None)
                sprite.pop("variantIcons", None)
                continue

            square(raw, SIZE).save(os.path.join(OUT_DIR, f"{sprite['id']}.png"), optimize=True)
            sprite["icon"] = True
            found.append(sprite["id"])

            # Les variantes ont chacune leur illustration : une statue doree
            # pour Or, une silhouette verte criblee de code pour Cheat Master.
            # On ne demande que celles que le catalogue declare : la wiki sert
            # des fichiers pour des variantes qui n'existent pas en jeu.
            owned = sprite.get("variants") or [v["id"] for v in catalogue["variants"]]
            got = []
            for variant in owned:
                prefix = VARIANT_PREFIX.get(variant)
                if not prefix:
                    continue
                try:
                    art = fetch(f"{prefix}_{wiki}")
                except Exception:                      # noqa: BLE001
                    # Meme garde-fou pour les variantes : si le fichier est
                    # deja la, l'echec vient du reseau, pas de la wiki.
                    if os.path.exists(os.path.join(VARIANT_DIR, f"{sprite['id']}-{variant}.png")):
                        got.append(variant)
                    continue
                square(art, VARIANT_SIZE).save(
                    os.path.join(VARIANT_DIR, f"{sprite['id']}-{variant}.png"), optimize=True)
                got.append(variant)
            if got:
                sprite["variantIcons"] = got
            else:
                sprite.pop("variantIcons", None)
            variant_found += got

        with io.open(path, "w", encoding="utf-8") as handle:
            json.dump(catalogue, handle, indent=2, ensure_ascii=False)
            handle.write("\n")

        print(f"{label} : {len(found)} icone(s) de base, {len(variant_found)} de variante, {len(missing)} sans")
        for sprite_id, why in missing:
            print(f"   {sprite_id:<16} {why}")
        total_found += found
        total_missing += missing
        total_variants += variant_found

    base = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
    var = sum(os.path.getsize(os.path.join(VARIANT_DIR, f)) for f in os.listdir(VARIANT_DIR))
    print(f"\nTotal : {len(total_found)} icones de base ({base / 1024:.0f} Ko), "
          f"{len(total_variants)} de variante ({var / 1024:.0f} Ko)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
