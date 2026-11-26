# Modèles de contenu

Quatre modèles vierges, prêts à dupliquer et à remplir à la main, sont dans `public/content/fr/_modeles/` :

| Modèle | Ce qu'il crée | Sections du fichier |
|---|---|---|
| `modele-fiche-theorie.json` | une fiche Théorie au format long, et ses nouveaux termes du glossaire | `theorie`, `glossaire` |
| `modele-equivalence.json` | une fonction de l'Arsenal (objets qui remplacent un outil) | `equivalences`, `objets` |
| `modele-experience.json` | une expérience du Laboratoire | `pratique` |
| `modele-mission.json` | une mission (situation, objets et leurres, solutions, 3 indices) | `missions`, `objets` |

Ce dossier **n'est jamais chargé par l'appli**. Il est exclu du build (rien n'est publié) et ignoré par le validateur.

## Voir le résultat avant d'écrire

Ouvre l'appli à l'adresse **`#/modeles`**, par exemple `http://localhost:5173/#/modeles` en local ou `https://tronn29.github.io/macgyver-lab/#/modeles` en ligne. Cette page cachée, absente des menus et de la recherche, affiche les 4 modèles avec **le vrai design** des fiches, schéma d'exemple compris. Chaque texte entre crochets apparaît exactement là où ira ton texte.

## Partir d'une fiche écrite dans l'appli

Une fiche ou une fonction écrite dans l'appli (« Mes fiches », « Mes fonctions ») a un bouton **Exporter** : il donne son texte au format de ces modèles, à copier ou à télécharger. Enregistre-le dans `public/content/fr/_modeles/` (ex. : `ma-fiche.json`) puis passe directement à l'étape 3. Ce qu'une fiche officielle exige en plus de l'éditeur est déjà ajouté entre crochets : le nom du schéma à dessiner, la version pour enfant, la précaution, les mots-clés, l'explication des questions et, si besoin, des paragraphes (au moins 4, dont « Dans la série / Dans la réalité »).

## 1. Dupliquer un modèle

Copie le modèle **dans le même dossier**, sous un nouveau nom :

```bash
cp public/content/fr/_modeles/modele-fiche-theorie.json public/content/fr/_modeles/ma-fiche.json
```

Garde ta copie dans `_modeles/` pendant que tu la remplis : elle n'apparaîtra pas dans l'appli tant qu'elle n'est pas ajoutée.

## 2. Remplir

- **Remplace chaque texte entre crochets** `[ … ]`. Le texte indicatif dit quoi écrire et sous quel format, avec un exemple après « ex. : ».
- **Garde les doubles crochets** `[[detente|se détend]]` : ce sont les termes du glossaire avec infobulle (`[[identifiant|texte affiché]]`). Un terme nouveau se décrit dans la section `glossaire` du même fichier.
- **Nombres et vrai/faux sans guillemets** : `"niveau": 2`, `"reponse": 0`, `"adulte": false`. Les autres valeurs gardent leurs guillemets.
- **Valeurs imposées** : les catégories (`thermique`, `mecanique`…), le verdict (`vrai`, `partiel`, `faux`) et la sécurité (`vert`, `orange`, `rouge`) s'écrivent en un seul mot, comme indiqué.
- **Lignes facultatives** : supprime celles dont tu n'as pas besoin, sans oublier la virgule qui les précède ou les suit.
- **Schéma** : duplique `public/schemas/modele-exemple.svg` sous ton nom (ex. : `public/schemas/ma-fiche.svg`), remplace ses textes entre crochets, puis indique ce nom dans `schema.fichier`. Les règles de dessin sont dans `CONTENU.md`.
- **Style** : suis le guide de style de `CONTENU.md`. Tutoiement, accroches en gras, comptes annoncés, pourquoi physique, ordres de grandeur avec leur équivalent concret (prononciation seulement pour les unités peu courantes), paragraphe « Dans la série / Dans la réalité », et « À retenir » à la fin.
- **Mission** : il faut 20 à 30 objets dans la pièce ; duplique les lignes d'objets. Les objets doivent exister dans `objets.json`, ou être décrits dans la section `objets` du modèle.

## 3. Vérifier qu'il ne manque rien

Avant le validateur, lance la vérification du modèle :

```bash
npm run modele:verifier -- public/content/fr/_modeles/ma-fiche.json
```

Elle ne modifie rien et liste, en français, tout ce qui reste à faire :

- les **textes entre crochets** encore présents, avec leur emplacement (ex. : `theorie[0].quiz[1].reponse`) ;
- les **champs obligatoires manquants** (« champ obligatoire manquant : « titre » ») et les champs mal orthographiés ;
- les **valeurs au mauvais format** : un nombre entre guillemets, une catégorie inconnue, un identifiant avec majuscules ou espaces ;
- les **identifiants déjà pris** et les **liens vers des fiches, fonctions, expériences, objets ou termes qui n'existent pas** ;
- le **schéma SVG introuvable** ;
- pour une fiche, l'absence du paragraphe « Dans la série / Dans la réalité » ou d'un « À retenir » final ; pour une mission, un leurre aussi utilisé dans une solution, ou une zone non déclarée.

Corrige, relance la vérification, et recommence jusqu'au message « ✓ Tous les champs obligatoires sont remplis ».

> Le fichier ne s'ouvre pas ? Une virgule en trop ou un guillemet manquant suffit à casser un fichier JSON. Le message indique où la lecture a échoué.

## 4. En faire une vraie fiche

```bash
npm run modele:ajouter -- public/content/fr/_modeles/ma-fiche.json
```

La commande :
1. refait la vérification et s'arrête si quelque chose manque ;
2. ajoute chaque section dans son fichier personnel de `public/content/fr/` : `theorie-perso.json`, `glossaire-perso.json`, `equivalences-perso.json`, `objets-perso.json`, `pratique-perso.json` ou `missions-perso.json`. Ces fichiers sont créés au besoin et déclarés dans `index.json` ;
3. lance le validateur complet. S'il refuse le contenu, **tout est remis comme avant**.

Relance l'appli (`npm run dev`) : ta fiche apparaît dans la liste. Ta copie dans `_modeles/` peut ensuite être supprimée ou gardée comme brouillon.

**Sans la commande** : copie à la main le contenu de chaque section (ce qui est entre `[` et `]`) à la fin du tableau du fichier correspondant de `public/content/fr/`, ou dans un nouveau fichier déclaré dans `index.json`, puis lance `npm run validate`.

## 5. Publier

```bash
npm run validate
npm test
git add -A && git commit -m "Nouvelle fiche : …" && git push
```

GitHub Pages republie l'appli automatiquement.

## Règle de contenu (inchangée)

Jamais de plans, de quantités ou de montages pour des armes, des explosifs ou des dispositifs dangereux. Les sujets sensibles restent au niveau du principe (`principeSeul`, sécurité rouge, aucune expérience liée). Le validateur bloque ce qui viole cette règle.
