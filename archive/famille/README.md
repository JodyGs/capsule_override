# Les esprits de la famille — mise de cote

Cette galerie a quitte l'app le 1er novembre 2026, a la bascule vers
Treasure Hunters. Elle n'est pas supprimee : elle est gardee ici, entiere,
en attendant d'etre reutilisee autrement.

## Ce qu'il y a dedans

- `sprites-family.json` — le catalogue : 9 fiches maison, une seule ligne de
  variante, `readOnly: true`, chacune avec son effet, sa source et sa teinte.
- `icons/` — les 9 illustrations, aux dimensions attendues par l'app.
- `t-family.mjs` — les tests qui la couvraient. Ils supposent le catalogue
  servi depuis `public/` : a remettre a jour en meme temps que le reste.

## Pourquoi elle sort

C'etait une galerie dans une app de suivi : rien a cocher, rien a compter,
des compteurs et des filtres qu'il fallait eteindre un par un a chaque
passage. Le bouton de collection tourne desormais sur trois saisons
d'esprits, ce qui est deja beaucoup pour un bouton.

## Comment la rebrancher, si on la rebranche telle quelle

Rien n'a ete arrache dans l'app : la mecanique de galerie est toujours la,
et les tests veillent dessus (`t-data.mjs`, section « la galerie maison,
mise de cote »). Il faut donc, dans cet ordre :

1. Ramener `sprites-family.json` dans `public/` et `icons/` dans
   `public/icons/family/`.
2. Rajouter l'entree dans `COLLECTIONS`, au bout de la table, avec
   `store: null` et `icons: "family"` — c'est `store: null` qui declenche la
   lecture seule, le repliage des fiches et l'extinction des compteurs.
3. Rajouter le catalogue et les neuf images dans la liste `SHELL` du service
   worker, et renumeroter `VERSION`.
4. Ramener `t-family.mjs` dans `tests/`.

Les teintes (`--f-orange` et les autres) sont restees dans `styles.css`,
definies dans les trois palettes. Un test le verifie, justement pour que ce
retour ne commence pas par une chasse aux couleurs disparues.

Mais la vraie question a poser avant de la rebrancher ici : est-ce que c'est
sa place ? Elle n'a jamais eu besoin des compteurs, du rebours, des filtres
ni des codes. Une page a elle lui irait mieux.
