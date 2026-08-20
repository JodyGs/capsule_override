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
(plus le thème sous `capsule-override.theme`).
Au démarrage, l'app appelle `navigator.storage.persist()` pour demander au système de ne pas
effacer ces données quand la place manque — l'écran **Réglages** vous dit si c'est accordé.

Ce qui **efface** vos coches : désinstaller l'app, vider les données de site du navigateur,
ou le bouton *Tout effacer*. Sur iOS, une app installée depuis l'écran d'accueil n'est pas
soumise à la purge des 7 jours qui touche les simples sites web.

Les sauvegardes des versions précédentes sont reprises automatiquement, y compris celles à
plusieurs profils — c'est le profil qui était ouvert qui devient votre collection.

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
aujourd'hui le **Chapitre 7 Saison 3 « Runners »** et ses 25 esprits de base.

C'est une collection **entièrement séparée** : son propre catalogue
(`public/sprites-legacy.json`), sa propre clé de stockage
(`capsule-override.legacy.v1`), ses propres compteurs, son propre export. Cocher un esprit
d'un côté ne touche jamais l'autre. La collection ouverte est retenue d'une visite à
l'autre, et le bandeau orange rappelle en permanence qu'on ne regarde pas la saison en cours.

Une limite assumée : la Saison 3 comptait **92 variantes** en plus des 25 esprits de base
(Or 20, Gummy 20, Galaxy 20, Gem 8, Holofoil 11, Cube 9, Quack 4), soit 117 pièces. Epic n'a
jamais publié quelle variante existait pour quel esprit, donc seuls les esprits de base sont
suivis. C'est écrit dans l'app plutôt que deviné.

### Ajouter une saison

Créez un `public/sprites-<saison>.json` sur le même modèle, ajoutez-le à `COLLECTIONS` dans
`public/app.js`, ses identifiants à `WIKI_NAME` dans `scripts/fetch-sprite-icons.py`, et son
fichier à la liste du service worker. Les identifiants d'esprits doivent être préfixés pour
ne pas entrer en collision d'une saison à l'autre (`l-` pour Runners).

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
  icons/sprites/         l'icone de chaque esprit, telle qu'elle apparaît en jeu
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
icônes des nouveaux venus : le script interroge la Fortnite Wiki, réduit les images en 96 px
et coche le champ `icon` des esprits trouvés. Ceux qui n'existent pas encore gardent une
pastille à initiale, teintée de leur rareté. Passer un esprit de `"released": false` à `true`
le fait entrer dans le calcul des scores ; les coches déjà posées dessus se rallument seules.

Pensez à incrémenter `VERSION` dans `public/sw.js` après une modification, pour que les
téléphones déjà installés récupèrent la nouvelle version — un bandeau leur proposera alors
de recharger.

---

## Ce qui a été vérifié, et ce qui ne l'a pas été

Testé dans un DOM simulé, 57 vérifications au vert : génération des 17 cartes et des 102
boutons, règle « maîtrisé implique débloqué », badge *Complet*, compteurs et barres, filtres
par rareté, statut et recherche, écriture différée dans le stockage, bouton *Tout effacer*,
les trois modes de thème avec leur persistance et la couleur de barre d'état, la reprise
d'une ancienne sauvegarde à profils, la bascule Legacy avec l'étanchéité des deux
collections, et surtout **réouverture de l'app avec des données existantes** — les coches
sont toutes restituées.

Le responsive est audité avec Playwright sur 10 formats (320 à 1440 px) × 2 thèmes × les
deux modes de pointeur : débordement horizontal, cibles tactiles, texte tronqué, erreurs
console. Aucun défaut mesuré.

L'image d'export a été rendue pour de vrai, hors navigateur, avec les vraies polices, dans
les deux thèmes, et inspectée visuellement.

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
