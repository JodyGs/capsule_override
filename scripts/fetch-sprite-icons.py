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
SIZE = 96          # affiche autour de 32 px, confortable en ecran 3x
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
    "bullet": "Bullet",
    "dumpster": "Dumpster_Dive",
    "honey": "Honey",
    "pond": "Pond",
    "xray": "X-Ray",

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
    total_found, total_missing = [], []

    for path in CATALOGUES:
        with io.open(path, encoding="utf-8") as handle:
            catalogue = json.load(handle)

        label = os.path.basename(path)
        found, missing = [], []
        for sprite in catalogue["sprites"]:
            wiki = WIKI_NAME.get(sprite["id"])
            if not wiki:
                missing.append((sprite["id"], "nom wiki inconnu"))
                sprite.pop("icon", None)
                continue
            try:
                raw = fetch(wiki)
                image = Image.open(io.BytesIO(raw)).convert("RGBA")
            except Exception as err:               # noqa: BLE001
                reason = "pas encore sorti" if "404" in str(err) or "22" in str(err) else type(err).__name__
                missing.append((sprite["id"], reason))
                sprite.pop("icon", None)
                continue

            image.thumbnail((SIZE, SIZE), Image.LANCZOS)

            # Carre exact, sujet centre : les lignes de la liste restent alignees.
            canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
            canvas.paste(image, ((SIZE - image.width) // 2, (SIZE - image.height) // 2), image)
            canvas.save(os.path.join(OUT_DIR, f"{sprite['id']}.png"), optimize=True)
            sprite["icon"] = True
            found.append(sprite["id"])

        with io.open(path, "w", encoding="utf-8") as handle:
            json.dump(catalogue, handle, indent=2, ensure_ascii=False)
            handle.write("\n")

        print(f"{label} : {len(found)} icone(s) recuperee(s), {len(missing)} sans")
        for sprite_id, why in missing:
            print(f"   {sprite_id:<16} {why}")
        total_found += found
        total_missing += missing

    size = sum(os.path.getsize(os.path.join(OUT_DIR, f"{i}.png")) for i in total_found)
    print(f"\nTotal : {len(total_found)} icones, {size / 1024:.0f} Ko")
    return 0


if __name__ == "__main__":
    sys.exit(main())
