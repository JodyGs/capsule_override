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
import re
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
    os.path.join(ROOT, "public", "sprites-override.json"),
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
    "trick": "Trick_or_Treat",
    # Treasure Hunters
    "fortune": "Fortune",
    "cursed": "Cursed",
}
# La wiki n'est pas toujours coherente d'une variante a l'autre : le Buisson
# s'y trouve sous « Bush » pour cinq de ses six formes, et sous « Bushranger »
# pour la Trick or Treat. On essaie donc les noms de rechange avant d'abandonner.
WIKI_ALIAS = {
    "bush": ["Bushranger"],
    # Les apostrophes des noms de Treasure Hunters ne survivent pas toujours
    # au nom de fichier : on essaie la forme nue avant d'abandonner.
    "t-halfpeeld": ["Halfpeeld", "Halfpeel'd_Banana"],
    "t-barry": ["Barry_OFish", "Barry_O_Fish"],
    "t-squibbly": ["Lil_Squibbly", "Squibbly"],
    "t-flacko": ["Lil_Flacko", "Flacko"],
    # L'esprit s'appelle Obsession en jeu, mais la wiki le classe sous le nom
    # du personnage du film — One Wish Willow — pour ses six formes.
    "obsession": ["One_Wish_Willow"],
}
BASE = "https://fortnite.weirdgloop.org/images/"
UA = "capsule-override/1.0 (projet de fan, non commercial)"

# Deuxieme source, en filet. La wiki publie les illustrations avec du retard :
# au lancement de Treasure Hunters, le 1er novembre, les onze esprits y
# renvoyaient une 404, et une saison sans images est une saison illisible.
# Sprite Catch, lui, les servait le jour meme. La wiki reste la source de
# reference — elle nomme, date et credite — et Sprite Catch ne sert que
# lorsqu'elle n'a rien. Les noms de fichiers y portent une empreinte qui
# change a chaque reversement : on relit la page a chaque passage plutot que
# de recopier une URL qui vieillira en silence.
CATCH_PAGE = "https://spritecatch.com/sprites/"
CATCH_SLUG = {
    "t-halfpeeld": "halfpeeld", "t-repete": "re-pete", "t-barry": "barry-ofish",
    "t-exmarks": "exmarks", "t-plundarrgh": "plundarrgh", "t-chester": "chester",
    "t-wayfinder": "wayfinder", "t-kelper": "kelper", "t-squibbly": "lil-squibbly",
    "t-flacko": "lil-flacko", "t-sweetdreams": "sweet-dreams",
}
_catch_cache = {}

# Troisieme source, pour ce que les deux premieres n'ont pas. FN Sprite
# Tracker sert ses images en WebP, sous un nom fixe : pas d'empreinte, donc
# pas de page a relire. Il porte des esprits que personne d'autre n'a — Lil
# Uzi Vert Jr. y figurait avant sa sortie. Attention : il comble aussi les
# trous avec des illustrations qui ne sont pas celles du jeu, alors chaque
# image recuperee ici se regarde avant d'etre publiee.
FNS_IMAGE = "https://fnsprites.app/sprites/{slug}_{style}.webp"
FNS_SLUG = {
    "t-halfpeeld": "halfpeeld", "t-repete": "repete", "t-barry": "barryofish",
    "t-exmarks": "exmarks", "t-plundarrgh": "plundarrgh", "t-chester": "chester",
    "t-wayfinder": "wayfinder", "t-kelper": "kelper", "t-squibbly": "lilsquibbly",
    "t-flacko": "lilflacko", "t-sweetdreams": "sweetdreams", "t-liluzi": "liluzivert",
}
FNS_STYLE = {"base": "normal", "fortune": "fortune", "cursed": "cursed"}

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
    "birthday": "Birthday",
    # v42.30 — Fortnitemares
    "spookydash": "Spooky_Dash",
    "vampire": "Vampire",
    "deer": "The_Deer",
    "obsession": "Obsession",

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

    # Treasure Hunters — mini-saison de fin de chapitre. Le prefixe « t- »
    # evite la collision dans le dossier d'icones, partage par les saisons.
    # La wiki n'avait rien publie le 1er novembre : les noms sont ici pour
    # que le premier passage utile les ramene sans y revenir.
    "t-halfpeeld": "Halfpeel'd", "t-repete": "Re-Pete",
    "t-barry": "Barry_O'Fish", "t-exmarks": "Exmarks",
    "t-plundarrgh": "Plundarrgh", "t-chester": "Chester",
    "t-wayfinder": "Wayfinder", "t-kelper": "Kelper",
    "t-squibbly": "Lil'_Squibbly", "t-flacko": "Lil'_Flacko",
    "t-sweetdreams": "Sweet_Dreams",
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


def _telecharger(filename):
    return _telecharger_url(BASE + urllib.parse.quote(filename))


def _telecharger_url(url):
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


def catch_urls(sprite_id):
    """Les illustrations que Sprite Catch sert pour cet esprit, par variante."""
    slug = CATCH_SLUG.get(sprite_id)
    if not slug:
        return {}
    if slug not in _catch_cache:
        try:
            page = _telecharger_url(CATCH_PAGE + slug).decode("utf-8", "replace")
        except Exception:                          # noqa: BLE001
            _catch_cache[slug] = {}
        else:
            motif = rf"https://img\.spritecatch\.com/sprites/{re.escape(slug)}/([a-z-]+)-[0-9a-f]+\.png"
            trouves = {}
            for m in re.finditer(motif, page):
                trouves[m.group(1)] = m.group(0)
            _catch_cache[slug] = trouves
    return _catch_cache[slug]


def illustration(sprite_id, noms, variant):
    """Les octets de l'illustration : la wiki d'abord, Sprite Catch ensuite."""
    prefix = "" if variant == "base" else VARIANT_PREFIX.get(variant)
    erreurs = []
    if prefix is not None and noms:
        try:
            return fetch(noms, prefix), "wiki"
        except Exception as err:                   # noqa: BLE001
            erreurs.append(str(err))
    url = catch_urls(sprite_id).get(variant)
    if url:
        return _telecharger_url(url), "spritecatch"

    slug, style = FNS_SLUG.get(sprite_id), FNS_STYLE.get(variant)
    if slug and style:
        try:
            return _telecharger_url(FNS_IMAGE.format(slug=slug, style=style)), "fnsprites"
        except Exception as err:                   # noqa: BLE001
            erreurs.append(str(err))
    raise RuntimeError(" | ".join(erreurs) or "aucune source ne sert cette image")


def fetch(name, prefix=""):
    """La wiki n'ecrit pas toujours « Sprite » dans le nom du fichier : « The
       Deer » s'y trouve sous « The_Deer_-_Item_-_Fortnite.png ». Et elle change
       parfois de nom d'une variante a l'autre. On essaie donc chaque nom connu
       sous les deux formes avant de declarer l'image absente."""
    erreurs = []
    for racine in name if isinstance(name, list) else [name]:
        tete = f"{prefix}_{racine}" if prefix else racine
        for filename in (f"{tete}_Sprite_-_Item_-_Fortnite.png",
                         f"{tete}_-_Item_-_Fortnite.png"):
            try:
                return _telecharger(filename)
            except Exception as err:                # noqa: BLE001
                erreurs.append(f"{filename} : {err}")
    raise RuntimeError(" | ".join(erreurs))


def main(argv=()):
    # Sans argument, les trois catalogues. Avec, seulement ceux qu'on nomme :
    # rapatrier onze esprits ne justifie pas de retelecharger les trois cents
    # images des saisons closes, et chaque telechargement est une occasion de
    # perdre une entree juste sur un incident reseau.
    chemins = [a if os.path.isabs(a) else os.path.join(ROOT, a) for a in argv] or CATALOGUES
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(VARIANT_DIR, exist_ok=True)
    total_found, total_missing, total_variants = [], [], []

    for path in chemins:
        with io.open(path, encoding="utf-8") as handle:
            catalogue = json.load(handle)

        label = os.path.basename(path)
        found, missing, variant_found, relais = [], [], [], []
        for sprite in catalogue["sprites"]:
            # Un esprit maison n'existe pas sur la wiki : sans ce garde-fou,
            # chaque passage du script lui retirerait son icone et le ferait
            # retomber sur la pastille a initiale.
            if sprite.get("custom"):
                continue
            wiki = WIKI_NAME.get(sprite["id"])
            noms = [wiki, *WIKI_ALIAS.get(sprite["id"], [])] if wiki else None
            # Pas de nom wiki n'est plus une impasse : les sources de secours
            # connaissent des esprits que la wiki n'a pas encore nommes. Si
            # aucune ne repond, on retombe sur le traitement d'echec habituel.
            if not wiki and sprite["id"] not in CATCH_SLUG and sprite["id"] not in FNS_SLUG:
                # Une fiche qui declare attendre son image n'est pas un defaut :
                # c'est un etat connu, ecrit dans le catalogue, et le script ne
                # doit pas le signaler comme une panne a chaque passage.
                raison = ("en attente, declaree dans le catalogue" if sprite.get("iconPending")
                          else "nom wiki inconnu")
                missing.append((sprite["id"], raison))
                sprite.pop("icon", None)
                continue
            try:
                raw, via = illustration(sprite["id"], noms, "base")
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
            if via != "wiki":
                relais.append((sprite["id"], via))

            # Les variantes ont chacune leur illustration : une statue doree
            # pour Or, une silhouette verte criblee de code pour Cheat Master.
            # On ne demande que celles que le catalogue declare : la wiki sert
            # des fichiers pour des variantes qui n'existent pas en jeu.
            owned = sprite.get("variants") or [v["id"] for v in catalogue["variants"]]
            got = []
            for variant in owned:
                if variant == "base":
                    continue
                try:
                    art, via = illustration(sprite["id"], noms, variant)
                except Exception:                      # noqa: BLE001
                    # Meme garde-fou pour les variantes : si le fichier est
                    # deja la, l'echec vient du reseau, pas de la wiki.
                    if os.path.exists(os.path.join(VARIANT_DIR, f"{sprite['id']}-{variant}.png")):
                        got.append(variant)
                    continue
                square(art, VARIANT_SIZE).save(
                    os.path.join(VARIANT_DIR, f"{sprite['id']}-{variant}.png"), optimize=True)
                got.append(variant)
                if via != "wiki":
                    relais.append((f"{sprite['id']}-{variant}", via))
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
        # Dire d'ou vient une image qui n'est pas venue de la wiki : le jour ou
        # la wiki publie, ces lignes disparaissent d'elles-memes.
        for quoi, via in relais:
            print(f"   {quoi:<22} servie par {via}")
        total_found += found
        total_missing += missing
        total_variants += variant_found

    base = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
    var = sum(os.path.getsize(os.path.join(VARIANT_DIR, f)) for f in os.listdir(VARIANT_DIR))
    print(f"\nTotal : {len(total_found)} icones de base ({base / 1024:.0f} Ko), "
          f"{len(total_variants)} de variante ({var / 1024:.0f} Ko)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
