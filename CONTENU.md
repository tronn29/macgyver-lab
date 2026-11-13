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
- **Contrôlé par le validateur** : 4 à 20 paragraphes ; le dernier commence par `**À retenir :**` ; un paragraphe contient « Dans la série » et « Dans la réalité » ; gras bien fermé. Il avertit aussi s'il manque l'accroche « Peu de gens savent que… », s'il trouve un tiret cadratin ou une liste à puces.

### Guide de style (toutes les futures fiches)

- **Voix MacGyver** : tu tutoies le lecteur, comme un coéquipier qui t'explique sur le terrain. Tournures typiques : « Peu de gens savent que… », « Si tu mets ça et ça… », « Pour faire ça, il faut… ».
- **Français correct, sans argot.** Pas de tiret cadratin (—) : utilise une virgule, deux-points ou une nouvelle phrase.
- **Partir de zéro, expliquer de A à Z** : ce qu'est l'objet ou le phénomène, comment il marche, ses types ou variantes et ce que chacun fait. Un lecteur qui ne sait rien doit tout comprendre.
- **Chaque paragraphe** ouvre sur une phrase d'accroche en gras qui dit l'idée, puis la développe.
- **Comparaisons avec le quotidien** : couvercle sur une casserole, bombe aérosol qui se refroidit, frigo…
- **Une accroche « Peu de gens savent que… »** pour le fait surprenant de la fiche.
- **Un paragraphe « Dans la série / Dans la réalité »** : ce que montre la fiction, ce qui se passe vraiment, et **un exemple concret où ça marcherait vraiment**.
- **Un « À retenir » final** : le principe en mots simples, avec des exemples du quotidien que le lecteur a déjà vécus.
- **Viser 350 à 600 mots** (2 à 3 minutes de lecture). Le temps affiché est calculé sur 200 mots par minute.
- **Infobulles** : balise 3 à 6 termes du glossaire, de préférence avec `[[id|texte affiché]]` pour ne pas changer la phrase.

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
