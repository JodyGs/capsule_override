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
CATALOGUE = os.path.join(ROOT, "public", "sprites.json")
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
    with io.open(CATALOGUE, encoding="utf-8") as handle:
        catalogue = json.load(handle)

    found, missing = [], []
    for sprite in catalogue["sprites"]:
        wiki = WIKI_NAME.get(sprite["id"])
        if not wiki:
            missing.append((sprite["id"], "nom wiki inconnu"))
            continue
        try:
            raw = fetch(wiki)
        except Exception as err:                       # noqa: BLE001
            reason = "pas encore sorti" if "404" in str(err) or "22" in str(err) else type(err).__name__
            missing.append((sprite["id"], reason))
            sprite.pop("icon", None)
            continue

        image = Image.open(io.BytesIO(raw)).convert("RGBA")
        image.thumbnail((SIZE, SIZE), Image.LANCZOS)

        # Carre exact, sujet centre : les lignes de la liste restent alignees.
        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(image, ((SIZE - image.width) // 2, (SIZE - image.height) // 2), image)

        path = os.path.join(OUT_DIR, f"{sprite['id']}.png")
        canvas.save(path, optimize=True)
        sprite["icon"] = True
        found.append((sprite["id"], os.path.getsize(path)))

    with io.open(CATALOGUE, "w", encoding="utf-8") as handle:
        json.dump(catalogue, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    total = sum(size for _, size in found)
    print(f"{len(found)} icones recuperees, {total / 1024:.0f} Ko au total")
    for sprite_id, size in found:
        print(f"   {sprite_id:<12} {size / 1024:5.1f} Ko")
    if missing:
        print(f"\n{len(missing)} sans icone (pastille de repli dans l'app) :")
        for sprite_id, why in missing:
            print(f"   {sprite_id:<12} {why}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
