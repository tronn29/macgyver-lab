# Guide du contenu — MacGyver Lab

Tout le contenu de l'appli vit dans `public/content/fr/` (fichiers JSON) et `public/schemas/` (schémas SVG). Tu n'as jamais besoin de toucher au code pour ajouter une fiche, une fonction, une expérience ou une mission.

## 1. Où ajouter quoi

| Je veux ajouter…            | Fichier(s)                                   | Format (voir `schema/content.schema.json`) |
|-----------------------------|----------------------------------------------|--------------------------------------------|
| une fiche Théorie           | `theorie-*.json` + un SVG dans `schemas/`    | `fiche`                                    |
| un objet du quotidien       | `objets.json`                                | `objet`                                    |
| une fonction d'Équivalences | `equivalences.json`                          | `fonction`                                 |
| une expérience Pratique     | `pratique.json` + un SVG                     | `experience`                               |
| une mission                 | `missions.json`                              | `mission`                                  |
| un terme du glossaire       | `glossaire.json`                             | `terme`                                    |
| un parcours thématique      | `parcours.json`                              | `parcours`                                 |

`index.json` liste les fichiers de chaque collection. Tu peux créer ton propre fichier (par exemple `theorie-perso.json`) et l'ajouter à la liste `theorie` : l'appli fusionne tous les fichiers.

## 2. Règles d'or

1. **Identifiants** : minuscules, chiffres et tirets (`pile-citron`). Ils doivent être uniques dans leur collection et ne jamais changer (la progression y est attachée).
2. **Liens** : on relie les éléments par leur identifiant (`"fiches": ["levier"]`). Le validateur signale tout lien cassé.
3. **Glossaire dans le texte** : écris `[[detente]]` pour afficher le terme avec son infobulle, ou `[[detente|se détend]]` pour choisir le texte affiché.
4. **Sécurité (règle non négociable)** : on explique des principes, jamais de mode d'emploi pour fabriquer une arme, un explosif, un fumigène ou un dispositif dangereux. Pour un sujet sensible, mets `"principeSeul": true`, `"securite": { "niveau": "rouge", … }`, aucune quantité, aucun plan, aucune liste de composants, et aucune expérience Pratique liée.
5. **Série ou réalité ?** : `vrai` (marche vraiment), `partiel` (marche partiellement), `faux`.
6. **Missions** : 20 à 30 objets, 3 indices exactement (1 : principe, 2 : objets, 3 : méthode). Les `motsCles` d'une solution sont des groupes de synonymes : chaque groupe retrouvé dans le texte du joueur valide une idée clé (les accents et majuscules sont ignorés).

## 3. Schémas SVG

- `viewBox="0 0 360 240"`, sans `width`, `height` ni fond : l'appli fournit la grille et le cadre.
- **Aucune couleur, police ou style en dur.** Uniquement les classes de `src/styles/schemas.css` :
  - traits : `s-line`, `s-thin`, `s-dash`, `s-accent` (cyan lumineux), `s-hot` (orange, chaleur, danger), `s-cold` (bleu glacier), `s-dim` (cotes), `s-leader` (ligne de légende) ;
  - surfaces : `s-solid` (objet), `s-ghost` (contour pointillé), `s-fill-accent`, `s-fill-hot`, `s-fill-cold`, `s-fill-muted`, `s-callout` (encadré de légende) ;
  - textes : `s-title`, `s-label`, `s-small`, `s-tiny`, `s-text-hot`, `s-text-cold`, `s-text-accent`, pastilles `s-badge` / `s-badge-hot` + `s-badge-text` ;
  - animations légères : `s-flow` (flux qui avance), `s-draw` (trait qui se dessine, ajoute `pathLength="1"`), `s-pulse`, `s-blink`, `s-diffuse` (gaz qui se diffuse), `s-spin`, `s-float`, et `s-delay-1` à `s-delay-3`.
- Flèches et repères partagés : `marker-end="url(#mg-arrow)"`, `#mg-arrow-hot`, `#mg-arrow-cold`, `#mg-dot`, et `#mg-tick` (début et fin des cotes).
- Éléments autorisés : `g`, `path`, `line`, `polyline`, `polygon`, `rect`, `circle`, `ellipse`, `text`, `tspan`. Pas de script, pas d'image, pas de lien externe.
- Textes courts, en français, taille minimale `s-tiny`. Garde 8 unités de marge sur les bords.
- Chaque schéma a un texte alternatif (`alt`) qui décrit ce qu'il montre, pas seulement son titre.

## 4. Vérifier

```bash
npm run validate
```

Le validateur contrôle le format, les identifiants en double, les liens cassés, les termes du glossaire, la présence des SVG, les classes et éléments interdits dans les SVG, et les règles des missions. Corrige tout ce qu'il signale, puis recharge l'appli.

## 5. Publier

Pousse tes modifications : Netlify ou GitHub Pages reconstruit l'appli. Sur le téléphone, l'appli récupère le nouveau contenu à la prochaine ouverture avec du réseau.
