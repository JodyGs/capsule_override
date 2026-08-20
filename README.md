# Capsule Override

Suivi des esprits de **Fortnite — Chapitre 7 Saison 4 « Override »**.
Cochez ce que vous avez *débloqué* et *maîtrisé*, variantes Or et Cheat Master comprises.

Application web **installable sur iPhone et Android**, qui fonctionne hors connexion.
**Aucun compte, aucun serveur, aucune base de données** : vos coches sont écrites dans le
stockage du téléphone et y restent.

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

Tout est dans le `localStorage` du navigateur, sous la clé `capsule-override.store.v3`.
Au démarrage, l'app appelle `navigator.storage.persist()` pour demander au système de ne pas
effacer ces données quand la place manque — l'écran **Réglages** vous dit si c'est accordé.

Ce qui **efface** vos coches : désinstaller l'app, vider les données de site du navigateur,
ou le bouton *Tout effacer*. Sur iOS, une app installée depuis l'écran d'accueil n'est pas
soumise à la purge des 7 jours qui touche les simples sites web.

**Transférer vers un autre téléphone** : *Réglages → Exporter / Partager* ouvre la feuille de
partage du système (AirDrop, Messages, Drive…). Sur l'autre appareil, installez l'app puis
*Réglages → Importer*. Le fichier contient tous les profils.

Jusqu'à **cinq profils** cohabitent sur un même appareil — pratique pour une tablette
partagée. Chacun a sa collection ; on bascule d'un simple appui sur la pastille.

---

## Structure

```
public/                  l'application, statique de bout en bout
  index.html
  app.js                 tout le comportement
  styles.css             thème clair et sombre, passe mobile
  sprites.json           le catalogue de la saison
  manifest.webmanifest   nom, icônes, mode plein écran
  sw.js                  service worker : fonctionnement hors connexion
  icons/
serve.js                 prévisualisation locale uniquement
scripts/make-icons.py    régénère les icônes (npm run icons)
```

### Mettre à jour la liste des esprits

Éditez **`public/sprites.json`** — c'est le seul fichier à toucher quand Storm Scout sort ou
que les esprits communautaires arrivent. Passer un esprit de `"released": false` à `true`
le fait entrer dans le calcul des scores ; les coches déjà posées dessus se rallument seules.

Pensez à incrémenter `VERSION` dans `public/sw.js` après une modification, pour que les
téléphones déjà installés récupèrent la nouvelle version — un bandeau leur proposera alors
de recharger.

---

## Ce qui a été vérifié, et ce qui ne l'a pas été

Testé dans un DOM simulé, 40 vérifications au vert : génération des 17 cartes et des 102
boutons, création et bascule de profils, plafond à 5, règle « maîtrisé implique débloqué »,
badge *Complet*, compteurs et barres, filtres par rareté, statut et recherche, écriture dans
le stockage, et surtout **réouverture de l'app avec des données existantes** — profils, profil
actif et coches sont tous restitués.

Non vérifié : le rendu visuel réel et l'installation sur un vrai téléphone, faute de
navigateur dans l'environnement de développement. À confirmer de votre côté.

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
Projet de fan, sans lien avec Epic Games.
