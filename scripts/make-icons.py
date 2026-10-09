#!/usr/bin/env python3
"""Genere les icones de l'app.

Le signe est la capsule : les deux anneaux du cadran de l'accueil. Dehors en
cyan les pieces debloquees, dedans en or celles maitrisees, et au centre un
pixel carre — le seul angle droit de la composition, qui rattache la marque
au jeu dont elle parle. Une coche aurait dit « liste a cocher » ; deux arcs
imbriques disent « collection en cours », ce qu'est reellement l'app, et se
lisent encore a trente-deux pixels la ou une coche en pixel art bavait.

Les arcs ne font pas un tour complet et n'ont pas la meme longueur : un
anneau ferme serait un logo de chargement, et deux arcs egaux une mire. Leur
asymetrie est ce qui en fait une marque.
"""
from math import cos, radians, sin

from PIL import Image, ImageDraw, ImageFilter

# Les memes jetons que la feuille de style, a la virgule pres : l'icone et
# l'ecran doivent etre du meme bleu.
BG_TOP = (26, 20, 40)
BG_BOT = (12, 9, 20)
CYAN   = (43, 227, 232)
GOLD   = (255, 201, 60)
# La piste des anneaux : le meme violet neutre que --surface-3 dans la feuille
# de style. Teinter la piste de la couleur de son arc virait au brun sale au
# centre de l'icone, et l'app ne le fait pas non plus.
TRACK  = (42, 34, 62)

SS = 4            # suranalyse : on dessine en grand, on reduit, les bords lissent
TOUR = 0.72       # part de tour de l'anneau exterieur
TOUR_IN = 0.44    # part de tour de l'anneau interieur


def degrade(size):
    """Le fond de l'app : un degrade vertical, du violet tres sombre au noir."""
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(size - 1, 1)
        d.line([(0, y), (size, y)],
               fill=tuple(round(BG_TOP[c] + (BG_BOT[c] - BG_TOP[c]) * t) for c in range(3)))
    return img


def lueur(couche, rayon, force):
    """Le halo de l'app : non pas un disque colore pose derriere le signe —
    il laverait le centre d'une teinte sale — mais le signe lui-meme, floute
    et affaibli. La lumiere suit alors exactement ce qui la produit."""
    flou = couche.filter(ImageFilter.GaussianBlur(rayon))
    a = flou.split()[3].point(lambda v: round(v * force))
    flou.putalpha(a)
    return flou


def arc(img, centre, rayon, trait, part, couleur, alpha=255):
    """Un arc a bouts ronds, `rayon` etant celui de sa ligne mediane.

    PIL epaissit un arc vers l'interieur de la boite : sans compensation, le
    trait et ses bouts ne tombent pas sur le meme cercle et l'icone louche.
    On elargit donc la boite d'une demi-epaisseur."""
    d = ImageDraw.Draw(img)
    debut, fin = -90.0, -90.0 + 360.0 * part
    r = rayon + trait / 2
    d.arc([centre - r, centre - r, centre + r, centre + r],
          debut, fin, fill=couleur + (alpha,), width=round(trait))
    for angle in ((debut, fin) if part < 1 else ()):
        x = centre + rayon * cos(radians(angle))
        y = centre + rayon * sin(radians(angle))
        b = trait / 2
        d.ellipse([x - b, y - b, x + b, y + b], fill=couleur + (alpha,))


def marque(size, inset):
    """La capsule seule, sur fond transparent. `inset` ramene le signe dans la
    zone sure : une icone masquable peut se faire rogner d'un cinquieme."""
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    c = n / 2
    echelle = 1.0 - inset

    r_ext = n * 0.330 * echelle
    r_int = n * 0.212 * echelle
    trait = n * 0.068 * echelle

    # Les arcs pleins, mis de cote : ils serviront deux fois, une fois flous
    # pour la lumiere, une fois nets par-dessus.
    signe = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    arc(signe, c, r_ext, trait, TOUR, CYAN)
    arc(signe, c, r_int, trait, TOUR_IN, GOLD)

    img = Image.alpha_composite(img, lueur(signe, trait * 1.1, 0.5))

    # Les pistes ensuite, a peine visibles. Elles sont ce qui distingue une
    # jauge d'un logo de chargement : sans elles, un arc interrompu n'a pas
    # de longueur de reference et ne dit plus qu'il manque quelque chose.
    arc(img, c, r_ext, trait, 1.0, TRACK)
    arc(img, c, r_int, trait, 1.0, TRACK)
    img = Image.alpha_composite(img, signe)

    # Le coeur : un carre, pas un disque. C'est le seul angle droit du signe,
    # et il suffit a rappeler le pixel art sans que rien ne bave en petit.
    cote = n * 0.090 * echelle
    coin = cote * 0.22
    ImageDraw.Draw(img).rounded_rectangle(
        [c - cote / 2, c - cote / 2, c + cote / 2, c + cote / 2],
        radius=coin, fill=CYAN + (255,))

    return img.resize((size, size), Image.LANCZOS)


def rendre(size, inset=0.0, arrondi=False):
    fond = degrade(size).convert("RGBA")
    out = Image.alpha_composite(fond, marque(size, inset))
    if arrondi:   # le favicon porte ses propres coins : il n'est jamais masque
        masque = Image.new("L", (size, size), 0)
        ImageDraw.Draw(masque).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=size // 5, fill=255)
        out.putalpha(masque)
    return out


cibles = [
    ("public/icons/icon-192.png",          192, 0.00, False),
    ("public/icons/icon-512.png",          512, 0.00, False),
    # Android peut rogner jusqu'au cercle inscrit : le signe recule d'autant.
    ("public/icons/icon-maskable-192.png", 192, 0.30, False),
    ("public/icons/icon-maskable-512.png", 512, 0.30, False),
    ("public/icons/apple-touch-icon.png",  180, 0.06, False),
    ("public/icons/favicon-32.png",         32, 0.00, True),
    ("public/icons/favicon-180.png",       180, 0.00, True),
]

for chemin, size, inset, arrondi in cibles:
    img = rendre(size, inset, arrondi)
    if chemin.endswith("apple-touch-icon.png"):
        plat = Image.new("RGB", (size, size), BG_BOT)   # iOS refuse la transparence
        plat.paste(img, mask=img.split()[3])
        plat.save(chemin)
    else:
        img.save(chemin)
    print(f"  {chemin}  {size}x{size}")
