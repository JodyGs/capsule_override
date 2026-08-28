# Capsule Override

Suivi des esprits de **Fortnite — Chapitre 7 Saison 4 « Override »**.
Cochez ce que vous avez *débloqué* et *maîtrisé*, variantes Or et Cheat Master comprises.

Application web **installable sur iPhone et Android**, qui fonctionne hors connexion.
**Aucun compte, aucun serveur, aucune base de données** : vos coches sont écrites dans le
stockage du téléphone et y restent. Thème clair, sombre ou automatique, au choix.

Deux collections cohabitent sans jamais se mélanger : la **saison en cours** (Chapitre 7
Saison 4 — Override) et les **saisons passées**, accessibles par le bouton *Legacy*.

---

## Essayer en local

```bash
npm start
```

`http://localhost:8787`, et l'adresse à ouvrir depuis un téléphone du même wifi s'affiche
aussi dans la console. Aucune dépendance à installer.

`public/` est un dossier **entièrement statique** — le petit serveur Node ne sert qu'à la
prévisualisation locale. En production, n'importe quel hébergeur de fichiers suffit.

---

## Mettre en ligne

Il faut du **HTTPS** : sans lui, aucun navigateur ne proposera l'installation.
Les trois options ci-dessous le fournissent gratuitement.

### Vercel

Maintenant que l'app n'a plus de base de données, Vercel convient parfaitement.

```bash
npx vercel --prod
```

Ou : dépôt GitHub → **Import Project** sur vercel.com → *Framework Preset* **Other**,
*Output Directory* **public**, pas de commande de build.

### Netlify

Le plus rapide sans compte : ouvrez `app.netlify.com/drop` et **glissez le dossier `public/`**
dans la fenêtre. Vous repartez avec une URL en `.netlify.app`.

### GitHub Pages

Poussez le dépôt, puis *Settings → Pages → Deploy from a branch*, dossier `/public` (ou
placez le contenu de `public/` à la racine d'une branche `gh-pages`). Les chemins de l'app
sont tous relatifs : elle fonctionne sans souci depuis un sous-dossier
`votre-pseudo.github.io/capsule-override/`.

---

## Installer sur le téléphone

Envoyez simplement **le lien**. C'est le seul « fichier à envoyer » qui fonctionne sur les
deux plateformes — voir la note plus bas sur l'APK et l'IPA.

**Android / Samsung** — ouvrez le lien dans Chrome ou Samsung Internet. Le navigateur propose
l'installation ; sinon, touchez **Installer** dans la barre de l'app, ou passez par
*menu ⋮ → Ajouter à l'écran d'accueil*. L'app obtient sa propre icône, son écran de
démarrage, et s'ouvre sans barre d'adresse.

**iPhone / iPad** — ouvrez le lien **dans Safari** (obligatoire : Chrome et Firefox sur iOS
ne savent pas le faire), puis **Partager → Sur l'écran d'accueil → Ajouter**. Le bouton
**Installer** de l'app affiche ces étapes en images si besoin.

---

## Où vivent les données

Tout est dans le `localStorage` du navigateur, sous la clé `capsule-override.store.v4`
(la saison passée sous `capsule-override.legacy.v1`, les codes du lobby sous
`capsule-override.codes.v1`, le thème sous `capsule-override.theme`, le pseudo Epic sous
`capsule-override.player.v1`).
Au démarrage, l'app appelle `navigator.storage.persist()` pour demander au système de ne pas
effacer ces données quand la place manque — l'écran **Réglages** vous dit si c'est accordé.

Ce qui **efface** vos coches : désinstaller l'app, vider les données de site du navigateur,
ou le bouton *Tout effacer*. Sur iOS, une app installée depuis l'écran d'accueil n'est pas
soumise à la purge des 7 jours qui touche les simples sites web.

Les sauvegardes des versions précédentes sont reprises automatiquement, y compris celles à
plusieurs profils — c'est le profil qui était ouvert qui devient votre collection.

---

## Le pseudo Epic

Au tout premier lancement — et seulement tant qu'aucun pseudo n'est enregistré sur
l'appareil — l'app ouvre une fiche qui demande le pseudonyme Epic Games du joueur.
Trois à seize caractères, comme chez Epic ; les espaces multiples sont écrasés.
**Plus tard** ferme la fiche sans rien écrire : elle sera reproposée au lancement suivant.

Une fois le pseudo enregistré, la fiche ne se rouvre plus jamais d'elle-même. Le pseudo
apparaît alors dans une pastille en haut à gauche — la toucher permet de le changer — et
dans **Réglages → Pseudo Epic Games**, où *Effacer* le retire (il sera redemandé au
prochain lancement).

Il **signe l'image d'export**, en haut à droite de l'en-tête, et il ouvre le **message
pré-rempli** de la feuille de partage : *« Jody Gs — ma collection d'esprits Override. »*, ou
*« … d'esprits Legacy. »* depuis l'autre collection. Le message reste court : les chiffres sont
déjà sur l'image, les répéter ferait doublon. Le nom du fichier reprend le pseudo aussi
(`capsule-override-jody-gs-2026-08-21.png`). Sans pseudo, image, message et nom de fichier
retrouvent exactement leur forme d'avant. Certaines applications ignorent le texte quand un
fichier l'accompagne — l'image porte de toute façon la même information. Il voyage aussi dans la sauvegarde JSON, mais à
l'import il n'est adopté que si l'appareil n'en a pas déjà un — on n'écrase jamais le
pseudo local. *Tout effacer* décoche la collection sans toucher au pseudo.

---

## Partager sa liste

*Réglages → **Exporter en image*** dessine la collection sur un canvas et produit un PNG
portrait : en-tête, score, barre de progression, une ligne par esprit avec ses trois
variantes, et une légende. L'image reprend le thème actif — elle ressemble à ce que vous
voyez à l'écran.

L'app essaie ensuite trois voies, dans cet ordre :

1. **`navigator.share`** — sur téléphone, ouvre la feuille de partage du système. WhatsApp,
   Messages, Discord, Instagram y figurent : l'image part directement dans la conversation.
2. **Presse-papier** — sur ordinateur, où le partage de fichiers n'existe pas, l'image est
   copiée. Il n'y a plus qu'à la coller dans WhatsApp Web ou Discord.
3. **Téléchargement** — dernier recours si ni l'un ni l'autre n'est disponible.

Une précision technique : on ne peut pas pré-attacher une image à WhatsApp par une URL
`wa.me` — ce lien ne transporte que du texte. La feuille de partage native est la seule voie
qui dépose vraiment le fichier dans la conversation, et c'est celle que l'app emprunte.

**Transférer vers un autre téléphone** est une autre affaire : l'image ne se réimporte pas.
Utilisez *Réglages → Sauvegarde JSON*, puis *Importer* sur l'autre appareil.

---

## Legacy : les saisons passées

Le bouton **Legacy**, à côté de Réglages, bascule sur le catalogue des saisons terminées —
aujourd'hui le **Chapitre 7 Saison 3 « Runners »**, ses 25 esprits et leurs 92 variantes.

C'est une collection **entièrement séparée** : son propre catalogue
(`public/sprites-legacy.json`), sa propre clé de stockage
(`capsule-override.legacy.v1`), ses propres compteurs, son propre export. Cocher un esprit
d'un côté ne touche jamais l'autre. La collection ouverte est retenue d'une visite à
l'autre, et le bandeau orange rappelle en permanence qu'on ne regarde pas la saison en cours.

### Les variantes, reconstituées fichier par fichier

Epic n'a jamais publié quelle variante existait pour quel esprit. La matrice a donc été
**établie empiriquement** : l'API MediaWiki de la Fortnite Wiki a été interrogée pour
énumérer tous les fichiers `<Variante>_<Esprit>_Sprite_-_Item_-_Fortnite.png`, et chaque
entrée a été vérifiée comme réellement servie.

| Ligne | Esprits concernés |
|---|---|
| Or | 20 |
| Gummy | 20 |
| Galaxy | 20 |
| Holofoil | 11 |
| Gem | 8 |
| Cube | 9 |
| Quack | 4 |

Soit **25 esprits de base et 92 variantes, 117 pièces**. Zero Point les possède toutes les
sept ; les cinq collaborations tardives (TheBurntPeanut, Vini Jr., Pollo, Ironmouse,
John Wick) n'en ont aucune.

**Trois entrées de la wiki ont été retirées** : `Gem_Ghost`, `Gem_Punk` et `Holofoil_Duck`.
Leurs fichiers existent bien sur le serveur de la wiki, mais un joueur a signalé que ces
variantes n'apparaissent pas en jeu — et leur retrait fait tomber les totaux exactement sur
les chiffres publiés par Epic (Gem 8, Holofoil 11, 117 pièces). La présence d'un fichier
n'est donc pas une preuve de sortie : c'est un bon rappel des limites de la méthode.

### Ajouter une saison

Créez un `public/sprites-<saison>.json` sur le même modèle, ajoutez-le à `COLLECTIONS` dans
`public/app.js`, ses identifiants à `WIKI_NAME` dans `scripts/fetch-sprite-icons.py`, et son
fichier à la liste du service worker. Les identifiants d'esprits doivent être préfixés pour
ne pas entrer en collision d'une saison à l'autre (`l-` pour Runners).

---

## Le rendez-vous du moment

Un bandeau sous les compteurs annonce le prochain rendez-vous de la semaine, ou celui qui
court : **Cheat Code Monday** (lundi 9 h à mardi 9 h à New York — les esprits montent deux fois
plus vite, la poussière est doublée), **New Sprite Day** (jeudi 9 h) et **Power Hours** (samedi).

Les horaires vivent dans `public/sprites.json`, sous `events`, en heure de New York. L'app les
convertit à l'heure du téléphone en passant par `Intl.DateTimeFormat` : le décalage est relu à
chaque calcul, donc les deux changements d'heure — qui ne tombent pas le même jour des deux
côtés de l'Atlantique — sont pris en compte au lieu d'être supposés. Un événement sans horaire
confirmé, comme les Power Hours, affiche son jour et pas un compte à rebours : annoncer une
heure qu'Epic n'a pas donnée serait pire que de se taire.

Un événement ponctuel reste **la nouvelle du jour** jusqu'à minuit à New York, pas pendant
24 heures glissantes — sinon un New Sprite Day du jeudi matin serait encore affiché le vendredi
à l'aube.

---

## Que faire maintenant

Le suivi sait ce qui manque, les codes savent ce qui s'obtient d'un mot tapé dans le lobby.
Le bouton **Que faire maintenant** met les deux bout à bout, ce qu'il fallait jusque-là faire
de tête. Le panneau range ce qui reste en quatre temps :

1. **À taper dans le lobby** — les codes non utilisés qui donnent une pièce qui vous manque.
   La pastille du bouton compte exactement ceux-là : c'est le seul chiffre sur lequel on peut
   agir dans la minute.
2. **À trouver en partie**, une rubrique par ligne de variante, avec la consigne générale et,
   pour les bases, la source propre à chaque esprit.
3. **À maîtriser** — ce qui est déjà là mais pas encore banqué.
4. Le rappel des codes qui ne donnent pas d'esprit mais restent à réclamer.

Le lien entre un code et une pièce est une donnée explicite (`"grants"` dans
`public/cheat-codes.json`), pas une lecture du libellé de récompense : sept codes la portent,
et un test vérifie qu'aucun ne vise un esprit ou une variante qui n'existe pas.

---

## Transférer, partager, coller

*Réglages → **Transférer vers un autre téléphone*** propose quatre gestes, un par intention,
plutôt qu'un seul bouton au comportement variable :

- **Partager la sauvegarde** ouvre la feuille de partage du téléphone — WhatsApp, Messages,
  Mail, AirDrop.
- **Enregistrer le fichier** télécharge, sans détour.
- **Importer un fichier** relit une sauvegarde.
- **Coller une sauvegarde** accepte le contenu reçu comme un simple message, et propose ensuite
  de remplacer sa collection **ou** de comparer.

Le partage descend une chaîne de replis, parce qu'**iOS refuse de partager beaucoup
d'extensions, dont `.json`** : le même contenu part alors en `.txt`, et si le système ne partage
aucun fichier, la sauvegarde file au presse-papier avec un message qui invite à la coller dans
une conversation. C'est pour cette dernière branche qu'existe *Coller une sauvegarde* : sans
elle, le repli produirait un texte que personne ne pourrait relire. L'import accepte donc aussi
bien `.json` que `.txt`, et valide sur le contenu, pas sur l'extension.

---

## Comparer avec quelqu'un

*Réglages → **Comparer avec quelqu'un*** ouvre la sauvegarde JSON d'un autre joueur et affiche,
côte à côte, ce qu'il a et que vous n'avez pas — et l'inverse. Strictement en lecture : rien
n'est écrit, et un test vérifie que la collection locale est identique avant et après. Si le
fichier vient d'une autre saison, un avertissement le dit et seules les pièces communes aux
deux catalogues sont comparées.

---

## Codes du lobby

Le bouton **Codes**, dans la barre du haut, ouvre la liste des codes du panneau
`…/ admin panel` — ceux qu'on tape dans le lobby avant de lancer une partie. Une pastille
dorée indique combien restent à utiliser.

**22 codes**, groupés par type de récompense, **tous cochables** une fois utilisés. Toucher
un code le copie dans le presse-papier. Le suivi vit dans sa propre clé
(`capsule-override.codes.v1`) : il est indépendant des collections d'esprits, puisqu'un code
se consomme au niveau du compte Epic, pas de la saison.

Les deux codes Tetris (`LetsBlockAndRoll`, `DontBlockMe`) se cochent comme les autres, mais
leur case est en pointillés et ils **ne comptent pas dans les 20 récompenses** : ils ne
donnent rien à réclamer et peuvent être retapés autant de fois qu'on veut. Les cocher est
une note personnelle, pas un gain acquis — d'où le fond neutre plutôt que la teinte
d'accent.

La liste vient de `public/cheat-codes.json`, recoupée sur huit sources le 27 août 2026
(Dexerto, Beebom, Destructoid, PCGamesN, Nintendo Life, allthings.how, TheGamer,
Insider Gaming). Trois codes portent une pastille dorée **nouveau** — ils sont apparus après
le lancement de la saison :

- **`JonesyIsGolden`** — esprit Jonesy **Or**, actif depuis le 24 août. Le premier code à
  offrir une variante Or plutôt qu'une Cheat Master.
- **`GatherAndCraft`** — esprit Buisson Cheat Master, conditionné à la quête d'histoire de
  Wrixel (Ziggy).
- **`H0p0nVC`** — 2 000 poussières, cinquième mot de la série multilingue.

Quatre entrées portent un avertissement là où les sources se contredisent (`O2Override`,
`DontBlockMe`, `Play4All`, `H0p0nVC`), et une précision neutre en gris là où l'information
est simplement utile. La distinction est volontaire : l'orange signale un désaccord entre
sources, le gris une note.

Epic distribue de nouveaux codes via le Discord officiel dans le cadre de l'ARG Override :
ajoutez-les dans `public/cheat-codes.json` et incrémentez `VERSION` dans `public/sw.js`.
Le champ `"new": true` allume la pastille dorée, `"warn"` l'avertissement orange et
`"note"` la précision grise.

---

## Thème

Trois modes, accessibles par le bouton de la barre du haut (qui les fait défiler) ou par
*Réglages → Apparence* :

| Mode | Effet |
|---|---|
| **Auto** | Suit le réglage clair/sombre du téléphone, et bascule avec lui en direct. |
| **Clair** | Reste clair quoi qu'il arrive. |
| **Sombre** | Reste sombre quoi qu'il arrive. |

Le choix est retenu et appliqué **avant le premier rendu** — pas de flash blanc à
l'ouverture. La couleur de la barre d'état du téléphone suit, ce qui compte en mode installé.

---

## Structure

```
public/                  l'application, statique de bout en bout
  index.html
  app.js                 tout le comportement
  styles.css             thème clair et sombre, passe mobile
  sprites.json           le catalogue de la saison
  cheat-codes.json       les codes du panneau d'administration du lobby
  icons/sprites/         l'icone de chaque esprit, telle qu'elle apparaît en jeu
  icons/variants/        l'illustration de chaque variante (Or, Cheat Master, Gummy…)
  manifest.webmanifest   nom, icônes, mode plein écran
  sw.js                  service worker : fonctionnement hors connexion
  icons/
serve.js                 prévisualisation locale uniquement
scripts/make-icons.py         régénère les icônes de l'app (npm run icons)
scripts/fetch-sprite-icons.py  récupère les icônes des esprits (npm run sprite-icons)
```

### Mettre à jour la liste des esprits

Éditez **`public/sprites.json`** — c'est le seul fichier à toucher quand Storm Scout sort ou
que les esprits communautaires arrivent. Puis `npm run sprite-icons` pour récupérer les
icônes des nouveaux venus : le script interroge la Fortnite Wiki, réduit les images en 288 px,
les ramène à une palette de 256 couleurs et coche le champ `icon` des esprits trouvés.
288 px couvre l'affichage à 96 px sur un écran 3×, et la palette divise le poids par quatre —
36 icônes pèsent 408 Ko alors qu'elles font trois fois la taille des premières, qui en
pesaient 396.

Le même script récupère aussi **l'illustration de chaque variante** (`Gold_`, `Cheat_Master_`,
`Gummy_`… sur la wiki) dans `public/icons/variants/`, en 96 px, et écrit la liste de celles
qui existent dans `"variantIcons"`. Il ne demande **que les variantes que le catalogue
déclare** : la wiki sert des fichiers pour des variantes qui n'existent pas en jeu, et c'est
exactement l'erreur qui avait fait compter 120 pièces au lieu de 117 en Legacy. Ceux qui n'existent pas encore gardent une
pastille à initiale, teintée de leur rareté. Passer un esprit de `"released": false` à `true`
le fait entrer dans le calcul des scores ; les coches déjà posées dessus se rallument seules.

**État au 27 août 2026** : toujours **11 esprits jouables**, mais leurs 33 variantes sont
désormais toutes obtenables — le New Sprite Day du 27 a livré les quatre derniers Cheat Master
(Klombo, Shadow, Jackrabbit, Killswitch), à trouver en réussissant des codes de triche en
partie. Storm Scout attend toujours un Sprite Day,
les cinq esprits communautaires attendent une mise à jour de mi-saison. Six autres noms
circulent depuis les fichiers du jeu — Meowscles, BodySlam, Cube, Headshot, Squibbly,
Overshield — sans effet connu ni moyen de les obtenir. Ils sont **cités dans les notes de
l'app, pas ajoutés au catalogue** : un fichier servi n'est pas une sortie, la saison passée
l'a déjà prouvé (voir plus haut). S'ils sortent, ils entrent dans `sprites.json` comme les
autres.

Pensez à incrémenter `VERSION` dans `public/sw.js` après une modification, pour que les
téléphones déjà installés récupèrent la nouvelle version — un bandeau leur proposera alors
de recharger.

---

## Ce qui a été vérifié, et ce qui ne l'a pas été

Testé dans un DOM simulé, 88 vérifications au vert : génération des 17 cartes et des 102
boutons, règle « maîtrisé implique débloqué », badge *Complet*, compteurs et barres, filtres
par rareté, statut et recherche, écriture différée dans le stockage, bouton *Tout effacer*,
les trois modes de thème avec leur persistance et la couleur de barre d'état, la reprise
d'une ancienne sauvegarde à profils, la bascule Legacy avec l'étanchéité des deux collections et
le nombre exact de variantes par esprit, le suivi des codes du lobby et son
indépendance vis-à-vis des collections, et surtout **réouverture de l'app avec des données existantes** — les coches
sont toutes restituées.

Le pseudo Epic, la structure de la carte et le plan d'action ont leur propre harnais,
78 vérifications au vert :
ouverture au premier lancement, silence total une fois le pseudo posé, refus du vide et des
longueurs hors bornes, normalisation des espaces, relecture de l'ancien format, « Plus tard »
qui n'écrit rien, effacement, étanchéité vis-à-vis de *Tout effacer*, et le fait que l'icône,
l'effet, la source et le tableau des variantes restent enfants directs de la carte.

Les catalogues ont le leur, **512 vérifications** qui tournent sans navigateur : les comptes
publiés (11 esprits jouables, 33 pièces, 25 esprits et 117 pièces en Legacy, 22 codes dont 20
récompenses), l'absence de code en double, la présence des trois variantes de la Couronne, les
trois variantes retirées de Legacy, et surtout le lien entre les données et les fichiers —
**chaque esprit marqué `icon` a bien son PNG, chaque PNG est précaché par le service worker, et
aucun ne descend sous 288 px**. C'est ce dernier contrôle qui rattrape l'oubli classique :
ajouter un esprit au JSON sans lancer le script d'icônes. Les vignettes de variantes passent
au même crible, plus deux règles à elles : une vignette ne peut exister que pour une variante
que l'esprit possède réellement, et aucun fichier ne doit traîner sans être déclaré.

Le responsive est audité avec Playwright sur 10 formats (320 à 1440 px) × 2 thèmes × les
deux modes de pointeur : débordement horizontal, cibles tactiles, texte tronqué, erreurs
console. Aucun défaut mesuré. L'audit vérifie aussi que **la résolution source de chaque
icône couvre sa taille d'affichage multipliée par la densité de l'écran** — c'est ce contrôle
qui a fixé les fichiers à 192 px quand l'icône est passée à 64 px.

Les rendez-vous ont vingt vérifications sur des instants figés — dont les deux changements
d'heure de l'automne 2026, qui tombent une semaine d'écart entre l'Europe et les États-Unis.

Le transfert a vingt vérifications : un téléphone qui accepte le `.json`, un iOS qui ne veut
que le `.txt`, un navigateur qui ne partage rien — et le retour par *Coller une sauvegarde*,
y compris le cas d'un texte qui n'en est pas une, où l'app doit refuser sans rien écrire.

L'encoche de l'iPhone a les siennes, vingt aussi : les retraits d'écran passent par des
variables CSS, ce qui permet de leur donner la valeur d'un iPhone 15 Pro (59 px en haut) dans
un navigateur de bureau et de vérifier que rien ne passe dessous, en cartes comme en liste,
barre collante comprise. Un test lit aussi la feuille de style pour interdire toute règle
`.appbar` qui poserait un `padding-top` sans le retrait : c'était exactement le défaut.

L'image d'export a été rendue pour de vrai, hors navigateur, avec les vraies polices, dans
les deux thèmes, et inspectée visuellement.

### La carte d'un esprit

L'image de l'esprit occupe **une colonne entière à gauche** ; le nom, l'effet et la source
s'empilent à sa droite, et le tableau des variantes reprend toute la largeur en dessous.
C'est une grille nommée sur `.card`, pas une imbrication de conteneurs : l'icône, le bloc de
titre, l'effet, la source et le tableau restent **enfants directs de la carte**, ce qui permet
à la vue liste de les redisposer en une ligne (`"icon top effect vt"`) sans toucher au HTML.

L'icône fait 96 px sur grand écran, 84 sur téléphone, 72 sous 380 px ; en vue liste elle reste
petite (40 à 44 px), parce que cette vue sert à balayer et que la densité y prime.

Toucher une illustration l'ouvre en grand, avec le nom de la variante et ce qu'elle fait.
Les fichiers de variante font 192 px et l'agrandissement plafonne à 208 px : au-delà ils
commenceraient à s'étirer, et une image floue vaut moins qu'une image petite.

Chaque ligne du tableau des variantes porte **sa propre vignette** — la statue dorée pour Or,
la silhouette criblée de code pour Cheat Master, les sept lignes de Legacy — pour qu'on voie
ce qu'on cherche et pas seulement son nom. Quand la vignette manque (un esprit pas encore
sorti), la pastille de couleur reprend sa place. Les 24 vignettes de la saison en cours sont
préchargées ; les 92 de Legacy se mettent en cache à la première consultation, ce qui évite
d'imposer 92 fichiers à l'installation pour une collection qu'on ouvre à l'occasion.

Non vérifié : le rendu de l'interface elle-même, l'installation sur un vrai téléphone, et le
comportement de la feuille de partage, faute de navigateur dans l'environnement de
développement. À confirmer de votre côté.

---

## Pourquoi pas un APK ou un IPA ?

- **iPhone** : envoyer un fichier d'app à installer n'existe pas. Il faut passer par l'App
  Store ou TestFlight, ce qui suppose un compte développeur Apple à 99 $/an et une revue.
  La PWA est la seule voie pour « envoyer un lien, la personne installe ».
- **Android** : un `.apk` est envoyable, mais il faut Android Studio et le SDK pour le
  produire, et le destinataire doit autoriser les sources inconnues. Si vous y tenez,
  [Capacitor](https://capacitorjs.com) emballe ce dossier `public/` tel quel en projet
  Android — mais la PWA fait déjà le travail, sans build ni signature.

---

Données recoupées le 20 août 2026 sur Game Rant, Insider Gaming, Destructoid, Sprite
Checklist, TechWiser et VICE. Storm Scout et les cinq esprits communautaires n'étaient pas
encore sortis : leurs raretés et effets sont signalés comme non confirmés dans l'interface.
## Crédits et droits

Les icônes des esprits proviennent de la [Fortnite Wiki](https://fortnite.weirdgloop.org/).
Fortnite, ses visuels et ses noms appartiennent à **Epic Games**. Ce projet est une œuvre de
fan **non commerciale**, publiée dans le cadre de la
[Fan Content Policy](https://www.fortnite.com/news/fan-content-policy) d'Epic, sans lien ni
affiliation avec Epic Games. Ne l'utilisez pas à des fins commerciales, et gardez
l'attribution affichée dans l'app.
