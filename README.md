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
plus vite, la poussière est doublée), **New Sprite Day** (jeudi 9 h) et **Power Hours** (samedi 14 h et 21 h, deux heures chacune).

Les horaires vivent dans `public/sprites.json`, sous `events`, en heure de New York. L'app les
convertit à l'heure du téléphone en passant par `Intl.DateTimeFormat` : le décalage est relu à
chaque calcul, donc les deux changements d'heure — qui ne tombent pas le même jour des deux
côtés de l'Atlantique — sont pris en compte au lieu d'être supposés. Un événement sans horaire
confirmé affiche son jour et pas un compte à rebours : annoncer une heure qu'Epic n'a pas
donnée serait pire que de se taire.

Un rendez-vous peut ouvrir **plusieurs fenêtres dans la même journée** — les Power Hours
tournent à 14 h puis à 21 h. Le champ `starts` prend alors la place de `start` et l'app génère
une occurrence par horaire, sinon le samedi à 17 h elle annoncerait le samedi suivant au lieu
de la séance du soir, quatre heures plus tard.

Un événement ponctuel reste **la nouvelle du jour** jusqu'à minuit à New York, pas pendant
24 heures glissantes — sinon un New Sprite Day du jeudi matin serait encore affiché le vendredi
à l'aube.

---

## Quoi de neuf

Quand Epic sort un esprit, le catalogue change mais l'app, elle, se ressemble : on peut jouer
une semaine sans remarquer les quatre nouvelles cartes. Une fiche **Quoi de neuf** s'ouvre donc
toute seule au premier lancement qui suit une mise à jour des données.

Il n'y a **pas de serveur derrière** — donc pas de push web, qui réclamerait un backend, des
clés VAPID et un abonnement par appareil. La nouvelle voyage dans le catalogue lui-même :
`public/sprites.json` porte un bloc `news` avec une `version`, un titre et quelques lignes. Le
service worker va chercher les JSON **en réseau d'abord**, si bien qu'au premier lancement
connecté qui suit un déploiement l'app découvre une `version` qu'elle n'a jamais vue, ouvre la
fiche, et enregistre cette version dans `capsule-override.news.v1`. Un tour, puis plus jamais.

Deux cas sont traités à part :

- **Toute première ouverture de l'app.** Rien n'est « neuf » quand tout l'est, et la fiche du
  pseudo occupe déjà l'écran. La version est enregistrée en silence : l'annonce ne servira
  qu'à partir de la mise à jour suivante.
- **Relire l'annonce.** Un bouton dans Réglages la rouvre à la demande, même déjà vue.

Pour annoncer une mise à jour, il suffit donc de changer `news.version` en même temps que
`updatedAt` — un test vérifie que les deux ne divergent pas.

## Que faire maintenant

Le suivi sait ce qui manque, les codes savent ce qui s'obtient d'un mot tapé dans le lobby.
Le bouton **Que faire maintenant** met les deux bout à bout, ce qu'il fallait jusque-là faire
de tête. Le panneau range ce qui reste en cinq temps :

1. **Le conseil du moment** — voir plus bas.
2. **À taper dans le lobby** — les codes non utilisés qui donnent une pièce qui vous manque.
   La pastille du bouton compte exactement ceux-là : c'est le seul chiffre sur lequel on peut
   agir dans la minute.
3. **À trouver en partie**, une rubrique par ligne de variante, avec la consigne générale et,
   pour les bases, la source propre à chaque esprit.
4. **À maîtriser** — ce qui est déjà là mais pas encore banqué.
5. Le rappel des codes qui ne donnent pas d'esprit mais restent à réclamer.

### Le conseil du moment

Le plan savait ce qui manque, l'agenda savait ce que le jeu récompense en ce moment ; les deux
s'ignoraient. Le panneau s'ouvre maintenant sur le croisement des deux.

Chaque rendez-vous déclare dans `sprites.json` ce qu'il favorise (`"focus"`) et la phrase à
dire (`"advice"`). Un lundi de **Cheat Code Monday**, monter au niveau 5 rapporte double :
« poussez au niveau 5 ce que vous avez déjà — vous en avez 5 qui attendent ». Pendant les
**Power Hours** du samedi, le taux des variantes remonte : « il vous en manque 58 ». Le reste
du temps, le bandeau reste neutre et annonce le prochain créneau.

Deux règles de chiffres, parce qu'un nombre mal choisi décourage plus qu'il n'aide :

- **Le compte n'apparaît que si le bonus court.** « Gardez vos 58 manquantes » affiché cinq
  jours à l'avance n'apprend rien et fait un mur.
- **Les Bounty Hunter sortent du compte des Power Hours.** Elles ne tombent pas des coffres,
  donc un boost de taux d'apparition ne les concerne pas.

### Les lignes qui ne se jouent pas pareil

Jusqu'à la sortie des Bounty Hunter, toutes les variantes se ramassaient de la même façon et
une consigne « en partie » suffisait. Ce n'est plus vrai : une **Bounty Hunter** n'apparaît que
sur un adversaire éliminé, et ne gagne d'XP qu'aux éliminations — fouiller un coffre ne la fait
pas monter d'un cran.

Chaque ligne déclare donc où on la trouve (`"find"`), et celles qui montent autrement le disent
(`"levelUp"`). Le plan s'en sert pour sortir ces pièces de la section *À maîtriser* et leur
donner la leur, **« Bounty Hunter — 2 à monter aux éliminations »** : afficher « niveau 5 puis
banque à un site d'extraction » aurait été faux sur la moitié du trajet. La note précise quand
même qu'une fois le niveau 5 atteint, elle se banque comme les autres.

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

## Les filtres

Trois filtres de statut, et chacun cherche **un état de pièce précis** — une pièce vaut 0
(pas obtenue), 1 (débloquée) ou 2 (maîtrisée) :

| Filtre | Ce qu'il cherche | À quoi il sert |
|---|---|---|
| **Manquants** | une pièce à `0` | la liste de chasse |
| **À maîtriser** | une pièce à `1` | la liste des niveaux 5 à finir |
| **Maîtrisés** | *toutes* les pièces à `2` | ce qui est bouclé |

Une carte s'affiche si elle contient au moins une pièce recherchée, et **son tableau ne montre
que ces pièces-là**. Demander « les manquants » et recevoir une carte où six lignes sur sept
sont déjà maîtrisées, c'est ne pas avoir répondu à la question.

Deux bugs vivaient là. *Manquants* testait « pas encore maîtrisée » (`< 2`), ce qui confond
*je ne l'ai pas* et *je l'ai sans l'avoir montée au niveau 5* : un esprit entièrement débloqué
apparaissait comme manquant, et avec 91 pièces presque tout passait le filtre. *Débloqués*
testait « au moins une pièce obtenue » (`>= 1`), ce qui englobait tout ce que *Maîtrisés*
montrait déjà — deux filtres pour un seul résultat. Le second est devenu **À maîtriser**, dont
le nom dit ce qu'il fait.

Les puces de rareté avaient leur propre trou : « À confirmer » était exclue en dur, si bien
qu'un esprit dont Epic n'a pas annoncé la rareté devenait **introuvable** dès qu'on touchait
ce filtre. Une rareté a désormais sa puce dès qu'un esprit la porte, et aucune autrement.

Cocher une pièce pendant qu'un filtre est actif la retire de la vue : c'est voulu, la liste se
vide à mesure. Le parcours naturel est donc *Manquants* pour trouver, puis *À maîtriser* pour
finir.

## Codes du lobby

Le bouton **Codes**, dans la barre du haut, ouvre la liste des codes du panneau
`…/ admin panel` — ceux qu'on tape dans le lobby avant de lancer une partie. Une pastille
dorée indique combien restent à utiliser.

**37 codes**, groupés par type de récompense, **tous cochables** une fois utilisés. Toucher
un code le copie dans le presse-papier. Le suivi vit dans sa propre clé
(`capsule-override.codes.v1`) : il est indépendant des collections d'esprits, puisqu'un code
se consomme au niveau du compte Epic, pas de la saison.

Les trois codes de transformation (`LetsBlockAndRoll`, `DontBlockMe`, `InsertCoinToContinue`)
se cochent comme les autres, mais
leur case est en pointillés et ils **ne comptent pas dans les 34 récompenses** : ils ne
donnent rien à réclamer et peuvent être retapés autant de fois qu'on veut. Les cocher est
une note personnelle, pas un gain acquis — d'où le fond neutre plutôt que la teinte
d'accent.

La liste vient de `public/cheat-codes.json`, recoupée sur onze sources le 24 septembre 2026
(VICE, lobbyhack.com, The Click, allthings.how, Beebom, Destructoid, PCGamesN, Nintendo Life,
GamesRadar, TheGamer, Game Rant). Trois codes portent une pastille dorée **nouveau**.

Un code n'entre que s'il est **confirmé par plusieurs sources**. Une vague de faux codes
circule depuis le début de la saison, et les listes publiées ne se recoupent pas : selon le
site, le total annoncé va de 22 à 43. `BRB` en est l'exemple — quatre sites le donnaient actif,
mais lobbyhack.com, le tracker le plus précis, l'exclut et signale la contrefaçon. Il a été
retiré, comme `PlayToLevelUp` qu'une seule source donne.

**Un code expiré sort de la liste.** `NoProLlama` n'était valable que du 7 au 14 septembre :
il a disparu le 17. Une case qu'on ne peut plus cocher n'aide personne, et la garder ferait
croire à une récompense encore disponible. Deux codes gardent volontairement une casse
inhabituelle — `NOCTURNEOP55N1` et `SAYH12WR1X3L` — parce qu'en casse mixte les `O`/`0` et
`1`/`l` deviennent ambigus à recopier ; le suivi, lui, ignore la casse.

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

Éditez **`public/sprites.json`** — c'est le seul fichier à toucher quand un esprit sort ou
que les esprits communautaires arrivent. Puis `npm run sprite-icons` pour récupérer les
icônes des nouveaux venus : le script interroge la Fortnite Wiki, réduit les images en 288 px,
les ramène à une palette de 256 couleurs et coche le champ `icon` des esprits trouvés.
288 px couvre l'affichage à 96 px sur un écran 3×, et la palette divise le poids par quatre —
36 icônes pèsent 408 Ko alors qu'elles font trois fois la taille des premières, qui en
pesaient 396.

Le même script récupère aussi **l'illustration de chaque variante** (`Gold_`, `Cheat_Master_`,
`Gummy_`… sur la wiki) dans `public/icons/variants/`, en 96 px, et écrit la liste de celles
qui existent dans `"variantIcons"`. Une coupure réseau **n'efface jamais une entrée juste** :
tant que le PNG est sur le disque, le script signale l'échec et passe. Sans ce garde-fou, un
timeout suffisait à retirer un esprit de la collection de tout le monde — c'est arrivé à
l'esprit Poisson de Legacy, rattrapé avant publication. Il ne demande **que les variantes que
le catalogue déclare** : la wiki sert des fichiers pour des variantes qui n'existent pas en jeu, et c'est
exactement l'erreur qui avait fait compter 120 pièces au lieu de 117 en Legacy.

**Le catalogue ne compte que des esprits sortis.** Un esprit entre dans la liste dès qu'Epic
a annoncé **une date** — sa carte l'affiche alors en clair, « À venir — 26 septembre » — mais
il reste hors du total tant qu'il n'est pas obtenable. Sans date, il ne figure pas du tout : ni
rareté, ni source, ni date, c'est une case qu'on ne peut pas cocher et qui ressemble à un trou
au milieu de la grille. Ces esprits vivent dans les notes de l'app —
nommés, datés quand Epic donne une date — et entrent dans `sprites.json` le jour de leur
sortie. Le champ `"released"` reste lu et le filtre « À venir » réapparaît tout seul s'il
revient un esprit non sorti ; l'app **remonte alors les sortis en tête** au chargement, avec
un tri stable qui conserve l'ordre du fichier à l'intérieur de chaque groupe. Deux tests
couvrent ce retour : l'un démarre l'app sur un catalogue inversé, l'autre y injecte un esprit
non sorti et vérifie qu'il se range en dernier sans compter dans le total.

**État au 24 septembre 2026** : **20 esprits jouables** et **96 pièces obtenables**, toutes
disponibles. Les variantes **Bounty Hunter** — cinquième et dernière ligne annoncée — sont
entrées dans le jeu le 24 septembre, et **Morgana** (Persona 5, Épique) est arrivée le même
jour par un correctif, avec ses cinq variantes d'un coup, un jour avant la date annoncée. Elles peuvent apparaître quand on élimine un adversaire,
et ne montent de niveau **qu'aux éliminations** : c'est la seule ligne qu'on ne peut pas
faire progresser en fouillant.

Une seule exception casse la règle « chaque esprit a toutes les variantes », et un compteur
naïf s'y trompe : **Mega Man n'a aucune variante**. D'où 96 et non 100. La **Couronne** garde
son cas à part : ses deux dernières variantes ne se trouvent pas, elles se méritent au bout de
la chaîne Base → Cheat Master → Or → Loot Hacker → Bounty Hunter, une victoire avec chacune.

L'esprit **Anniversaire** figure dans la liste **avec sa date de sortie** — samedi
26 septembre, les neuf ans du jeu — et sa carte porte « À venir — 26 septembre ». Il n'entre
pas dans les 96 pièces : une case qu'on ne peut pas encore cocher ne se compte pas. Le filtre
*À venir* réapparaît tout seul pour le retrouver d'un geste.

La date vient des notes officielles d'Epic, pas d'une fuite ; c'est ce qui la distingue des
deux esprits communautaires restants, **Plongeon dans la benne** et **Miel**, qui n'ont ni
date ni rareté et restent donc **hors du catalogue**. Une fiche entre quand Epic a dit quand.

La **Bounty Hunter Morgana** est signalée buguée à sa sortie par une source : la note de la
pièce le dit, plutôt que de laisser croire à un manque de chance.

La rareté de **Blinky** est confirmée **Légendaire** par une deuxième source. Celle de
**Mare** est **Rare** — un site secondaire la dit Épique, les notes officielles d'Epic
tranchent.

Le **Bullet** d'Enorull ne sortira jamais : Epic l'a échangé contre l'**Onigiri** du même
créateur. Cinq autres noms
circulent depuis les fichiers du jeu — Meowscles, BodySlam, Cube, Headshot, Squibbly — sans
effet connu ni moyen de les obtenir. Ils sont **cités dans les notes de
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

Les catalogues ont le leur, **917 vérifications** qui tournent sans navigateur : les comptes
publiés (20 esprits jouables, 96 pièces, un esprit daté mais non compté, 25 esprits et
117 pièces en Legacy, 37 codes dont 34 récompenses), la répartition des raretés, l'absence de code en double, le fait qu'aucun code
n'offre une variante non obtenable, que Mega Man n'ait qu'une ligne et les quinze autres
quatre, qu'aucun esprit retiré ne laisse d'image ou d'entrée de précache derrière lui, les
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

Données recoupées le 24 septembre 2026 sur les notes officielles v42.20 d'Epic, Game Rant,
Sprite Checklist, AccountShark, Beebom, The Click, lobbyhack.com, MySprites et VICE. Seule la
rareté de Blinky reste non recoupée. Ce qui est annoncé mais pas encore obtenable est cité
dans les notes de l'app, pas listé dans le catalogue.
## Crédits et droits

Les icônes des esprits proviennent de la [Fortnite Wiki](https://fortnite.weirdgloop.org/).
Fortnite, ses visuels et ses noms appartiennent à **Epic Games**. Ce projet est une œuvre de
fan **non commerciale**, publiée dans le cadre de la
[Fan Content Policy](https://www.fortnite.com/news/fan-content-policy) d'Epic, sans lien ni
affiliation avec Epic Games. Ne l'utilisez pas à des fins commerciales, et gardez
l'attribution affichée dans l'app.
