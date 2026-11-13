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
3. **Texte enrichi** : écris `[[detente]]` pour afficher un terme du glossaire avec son infobulle, ou `[[detente|se détend]]` pour choisir le texte affiché. Écris `**texte**` pour mettre en gras. Le gras qui ouvre un paragraphe devient sa phrase d'accroche, mise en valeur.
4. **Sécurité (règle non négociable)** : on explique des principes, jamais de mode d'emploi pour fabriquer une arme, un explosif, un fumigène ou un dispositif dangereux. Pour un sujet sensible, mets `"principeSeul": true`, `"securite": { "niveau": "rouge", … }`, aucune quantité, aucun plan, aucune liste de composants, et aucune expérience Pratique liée. Le validateur bloque les termes de fabrication dangereux partout, ainsi que les quantités de matière et le vocabulaire de montage dans les sujets sensibles.
5. **Série ou réalité ?** : `vrai` (marche vraiment), `partiel` (marche partiellement), `faux`.
6. **Missions** : 20 à 30 objets, 3 indices exactement (1 : principe, 2 : objets, 3 : méthode). Les `motsCles` d'une solution sont des groupes de synonymes : chaque groupe retrouvé dans le texte du joueur valide une idée clé (les accents et majuscules sont ignorés).

## 3. Fiches Théorie : format long (v2)

Une fiche se lit comme un texte qui coule, de A à Z, et non plus comme une liste de points. Le champ `texte` est une liste de paragraphes :

```json
{
  "id": "detente-co2-froid",
  "titre": "Extincteur au CO₂ et froid",
  "sousTitre": "Comment un extincteur coupe un feu, et pourquoi le CO₂ givre en sortant",
  "categories": ["thermique", "pression"],
  "schema": { "fichier": "detente-co2-froid.svg", "alt": "…", "legende": "…" },
  "texte": [
    "**Un extincteur n'éteint pas un feu, il lui retire ce dont il a besoin.** Un feu a besoin de…",
    "**Peu de gens savent que le CO₂ est stocké sous forme liquide.** Dans la bouteille…",
    "**Dans la série**, … **Dans la réalité**, …",
    "**À retenir :** quand un gaz [[detente|se détend]], …"
  ],
  "enfant": "…",
  "realite": { "verdict": "partiel", "explication": "…" },
  "securite": { "niveau": "orange", "note": "…" },
  "liens": { "fiches": ["choc-thermique"] },
  "quiz": [ … ]
}
```

- **Compatibilité** : une fiche sans `texte` garde l'ancien format (`principe` en 3 lignes + `pourquoi`). Tu peux migrer les fiches une par une : ajoute `texte`, puis supprime `principe`, `pourquoi` et `chiffres`, qui ne sont plus affichés.
- **Ce qui reste affiché** : titre, schéma, temps de lecture (calculé automatiquement, inutile de remplir `duree`), étiquette « Série ou réalité ? », niveau de sécurité, liens, quiz, infobulles, mode enfant (`enfant`), lecture vocale et carnet.
- Le paragraphe « Dans la série… Dans la réalité… » s'affiche dans un encadré orange avec l'étiquette « Série ou réalité ? ». Le paragraphe « À retenir » s'affiche dans un encadré final.
- **Données clés et échelle** : `chiffres` (avec `dit` et `concret`) s'affichent dans le format court ; `echelle` s'affiche dans les deux formats, après le texte.
- **Contrôlé par le validateur** : 4 à 20 paragraphes ; le dernier commence par `**À retenir :**` ; un paragraphe contient « Dans la série » et « Dans la réalité » ; gras bien fermé. Il avertit aussi s'il manque l'accroche « Peu de gens savent que… », s'il trouve un tiret cadratin ou une liste à puces.

### Guide de style (toutes les futures fiches)

Chaque fiche part de zéro et explique de A à Z, **sans être trop longue** (viser 500 à 900 mots, soit 3 à 5 minutes de lecture ; la fiche de référence CO₂ en fait 860). Elle doit :

1. **Annoncer les comptes explicitement** : « il existe 4 types », « un feu a besoin de 3 choses », « il suffit d'en retirer 1 ». Un lecteur retient mieux un nombre annoncé.
2. **Expliquer le pourquoi physique, pas seulement le quoi** : pourquoi un gaz qui se détend se refroidit, pourquoi une température s'arrête à une valeur précise, pourquoi tel matériau casse et pas un autre.
3. **Dire où on trouve les objets dans la vie réelle** : « on le trouve près des tableaux électriques, dans les salles informatiques ».
4. **Utiliser des comparaisons du quotidien** (un couvercle sur une casserole, une foule dans un métro bondé, la bombe aérosol qui glace la main) et des accroches de terrain : « Peu de gens savent que… », « Si tu mets ça et ça… », « Pour faire ça, il faut… ».
5. **Voix MacGyver** : tu tutoies le lecteur ; français correct, sans argot ; **pas de tiret cadratin (—) ni demi-cadratin (–)**.
6. **Donner chaque ordre de grandeur avec sa prononciation entre parenthèses et son équivalent concret** (voir la règle ci-dessous).
7. **Un paragraphe « Dans la série / Dans la réalité »** avec un **cas concret où ça marcherait vraiment**.
8. **Finir par « À retenir »**, qui résume en mots simples, avec des exemples du quotidien.
9. **Infobulles** : balise 3 à 8 termes du glossaire avec `[[id|texte affiché]]`, pour ne pas changer la phrase.

### Règle des ordres de grandeur (toutes les fiches)

Chaque valeur chiffrée avec unité, chaque valeur de symbole et chaque formule est **suivie de sa prononciation entre parenthèses**, puis d'une **explication de ce qu'elle représente dans la vie réelle** :

> Dans la bouteille, il est à environ 57 bar (cinquante-sept bars), soit presque soixante fois la pression de l'air autour de toi.

> μ = 0,3 (mu égale zéro virgule trois) : une valeur facile à avoir sur un tronc moyen.

- **Nombres** en toutes lettres ; décimales avec « virgule » ; négatifs avec « moins » ; `≈` se dit « environ » ; `×7` « fois sept » ; `10⁻⁸` « dix puissance moins huit » ; intervalle `0,4 à 0,6` « zéro virgule quatre à zéro virgule six ».
- **Unités** en toutes lettres et accordées : degrés Celsius, bars, mètres, volts, ampères, watts, newtons, ohms, pour cent, mètres par seconde…
- **Symboles** : μ (mu), Δ (delta), Ω (ohm), ω (oméga), F₁ (F un), v² (v au carré), ½ (un demi).
- **Données clés** (`chiffres`) : remplis `dit` (la prononciation) et `concret` (l'équivalent concret).
- **Échelle de repères** (`echelle`) : pour graduer une grandeur (ex. : coefficient de frottement), chaque niveau a `valeur`, `dit` et `description`.
- **Exceptions** : les étiquettes des schémas SVG restent courtes (pas de prononciation dans le dessin) ; dans les choix de quiz, la prononciation suffit, l'équivalent concret va dans l'explication.

Le validateur affiche un **avertissement** (sans bloquer la construction) pour chaque valeur détectée sans parenthèse de prononciation, et pour chaque donnée clé sans `dit` ou `concret`.

### Règle de contenu (inchangée)

Jamais de plans, de quantités ou de montages pour des armes, des explosifs ou des dispositifs dangereux. Les sujets sensibles restent au niveau du principe (`principeSeul`).

## 4. Schémas SVG

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

## 5. Vérifier

```bash
npm run validate
```

Le validateur contrôle le format, les identifiants en double, les liens cassés, les termes du glossaire, la présence des SVG, les classes et éléments interdits dans les SVG, et les règles des missions. Corrige tout ce qu'il signale, puis recharge l'appli.

## 6. Publier

Pousse tes modifications : Netlify ou GitHub Pages reconstruit l'appli. Sur le téléphone, l'appli récupère le nouveau contenu à la prochaine ouverture avec du réseau.
