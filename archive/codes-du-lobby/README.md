# Les codes du lobby — mis de cote

L'ecran **Codes** a quitte l'app le 1er novembre 2026, avec la bascule vers
Treasure Hunters. La liste n'est pas supprimee : elle est gardee ici, telle
qu'elle etait au dernier releve.

## Ce qu'il y a dedans

`cheat-codes.json` — 56 codes du panneau `…/ admin panel`, groupes par type
de recompense : esprits offerts, poussiere, gizmos, XP et cosmetiques,
transformations du lobby. Chaque code porte sa recompense, s'il est a usage
unique, et le cas echeant son avertissement (condition de quete, desaccord
entre sources). Sept d'entre eux declarent la variante qu'ils offrent, par
`grants`, ce qui permettait au plan d'action de dire « celle-la, un mot dans
le lobby suffit ».

## Pourquoi ils sortent

Parce qu'ils ne repondaient plus a la question que l'app pose.

- Les codes qui versaient une variante **Cheat Master** habillent des esprits
  d'Override. Depuis la bascule, ces esprits ne se ramassent plus en partie :
  le code existe peut-etre encore, mais il ne fait plus avancer aucune case.
- La **poussiere** et les **gizmos** sont repartis de zero avec la saison.
- Aucune liste publique n'a revu ces codes depuis le 28 octobre. Un ecran qui
  affiche cinquante-six entrees non reverifiees a l'air d'un ecran a jour :
  c'est le pire des deux etats possibles.

## Comment les rebrancher, le jour ou Epic en redistribue

Tout est dans l'historique du depot, au commit qui les a retires. Il faut
ramener, dans cet ordre :

1. `cheat-codes.json` dans `public/`, remis a jour — pas tel quel.
2. Le bloc « Codes du panneau d'administration du lobby » de `app.js`, qui
   portait le stockage (`capsule-override.codes.v1`), la construction de la
   liste, la copie dans le presse-papier et la pastille du bouton.
3. Le bouton et la modale `#codes` dans `index.html`, et les styles
   `.code-row` et compagnie dans `styles.css`.
4. Dans le plan d'action, la section « A taper dans le lobby » et le decompte
   des codes sans esprit, qui reposaient sur `codeFor()` et `plan.spare`.
5. Le fichier dans la liste `SHELL` du service worker, et `VERSION`
   renumerotee.
6. Le bloc de tests des codes dans `t-data.mjs`, et `cheat-codes.json` dans
   la table des fichiers servis de `tests/dom.mjs`.

La pastille du bouton **Que faire maintenant** comptait les pieces derriere
un code ; elle compte desormais celles qui attendent une extraction. Si les
codes reviennent, c'est le genre d'arbitrage a reprendre plutot qu'a defaire :
les deux chiffres sont justes, mais un bouton n'en porte qu'un.
