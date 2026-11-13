# Audit technique (phase 3)

## Méthode

- **Validateur de contenu** (`npm run validate`) : format, liens, glossaire, SVG, règles des missions et de sécurité.
- **34 tests unitaires** (`npm test`) :
  - score de chaque mission (la solution de référence réussit, le vide échoue, leurres et indices coûtent bien leurs points, la solution la plus proche est choisie) ;
  - révision espacée, recherche, migration du stockage, série de jours, défi du jour, points faibles ;
  - liens symétriques ;
  - présence de toutes les clés de traduction, absence d'emoji.
- **Parcours automatique dans le navigateur** de **203 pages** (toutes les fiches, fonctions, objets, expériences, missions, terrains, rapports, parcours) : aucune erreur, aucun titre manquant, aucune erreur en console.
- **139 liens internes** suivis un par un : aucun lien cassé.
- **33 schémas SVG** rendus et mesurés : aucun texte ne sort du cadre.
- **Tests manuels et pilotés** en portrait (375 × 812), en paysage (812 × 375), en tablette et sur ordinateur (1440 × 900), en thème sombre et clair.
- **Hors connexion** : build de production, installation du service worker, **arrêt du serveur**, puis rechargement. La fiche, le schéma, le contenu JSON et les polices se chargent depuis le cache.
- **Contrastes** : mesure automatique de tous les textes sur 12 pages dans les 2 thèmes.
- **Lighthouse** (mobile, réseau ralenti simulé).

## Bugs trouvés et corrigés

| # | Bug | Correction |
|---|---|---|
| 1 | L'attribut `hidden` était écrasé par `display: …` : la puce « Hors ligne » restait visible en ligne, et le panneau du mode enfant et les infobulles s'affichaient mal | Règle globale `[hidden] { display: none !important }` |
| 2 | Le bouton « agrandir » recouvrait un libellé du schéma | Bouton sorti du cadre |
| 3 | La règle `.schema svg { width: 100% }` agrandissait aussi l'icône du bouton | Règle limitée au dessin |
| 4 | Le libellé « Chute de température » débordait du schéma de référence ; une fissure touchait la cote | Libellé raccourci, tracé ajusté |
| 5 | **Rechargement automatique au premier lancement** (installation du service worker) : environ 2 s perdues | Rechargement seulement après une mise à jour demandée |
| 6 | Le raccourci `/` plantait si l'événement ne venait pas d'un élément | Cible sécurisée |
| 7 | Ouvrir l'écran d'une mission créait un brouillon et affichait « En cours » | Brouillon créé uniquement en cas de progression réelle |
| 8 | « Point faible » détecté sur une seule réponse | Seuil de données minimal |
| 9 | Nom accessible des onglets de navigation et de la puce de série différent du texte visible (WCAG 2.5.3) | Le texte visible fait partie du nom |
| 10 | Contraste 4,21:1 du coût des indices verrouillés (opacité) | Opacité retirée, bordure en pointillés |
| 11 | Thème clair : plusieurs textes entre 3,95 et 4,50:1 | Palette claire assombrie : 0 échec |
| 12 | Sauts de niveau de titre (h1 → h3) sur les listes | Titres h2 masqués visuellement |
| 13 | Le contrôle d'équilibre des balises SVG du validateur donnait de faux positifs | Expression régulière corrigée |
| 14 | Erreurs TypeScript (valeurs nulles dans `replaceChildren`, typage du dictionnaire de langue) | Corrigées ; typecheck sans erreur |
| 15 | Idées clés affichées sans accents | Libellés accentués |
| 16 | `robots.txt` absent (la page HTML était renvoyée à la place) | Fichier ajouté (`Disallow: /`) |

**Bugs connus restants : aucun.**

## Lighthouse (mobile, après corrections)

| Page | Performance | Accessibilité | Bonnes pratiques |
|---|---|---|---|
| Accueil | 97 | 100 | 100 |
| Écran de mission (terrain) | 97 | 100 | 100 |

Mesures sur l'accueil : FCP 1,7 s, LCP 2,4 s, TBT 10 ms, CLS 0. Poids total : JS ≈ 48 Ko compressé, CSS ≈ 15 Ko compressé. Pas d'image matricielle dans l'interface.

Pour relancer une mesure :

```bash
npm run build && npm run preview
npx lighthouse http://localhost:4173/ --form-factor=mobile --view
```

## Format long des fiches (v2) : vérifications et corrections

- Tests : 47 au total. Les 13 nouveaux vérifient :
  - que le texte de la fiche CO₂ est identique au texte fourni ;
  - la structure du texte et la compatibilité avec l'ancien format ;
  - le temps de lecture et la recherche dans le texte long ;
  - que le validateur bloque 6 cas fautifs (« À retenir » absent, paragraphe série/réalité absent, gras mal fermé, terme de fabrication dangereux, quantité dans un sujet sensible, sujet sensible relié à une expérience).
- Affichage vérifié sur téléphone en portrait (375 × 812) et en paysage (812 × 375), pour une fiche migrée et une fiche non migrée. Les 22 fiches et 5 pages annexes s'affichent sans erreur.
- Contraste : 0 échec, dans les 2 thèmes et pour les 2 formats. Titres sans saut, un seul `h1`.

| Défaut trouvé | Correction |
|---|---|
| Un terme du glossaire de plusieurs mots (bouton) ne se coupait pas en fin de ligne et laissait un trou dans le texte | Les termes sont devenus des liens vers le glossaire. Ils se coupent comme du texte et ouvrent la même infobulle au clic, au clavier et au survol. |
| Dans « À retenir », l'accroche en bloc laissait la phrase commencer par une minuscule | Accroche gardée en ligne |
| Une étiquette du nouveau schéma dépassait du cadre (x = 361), et deux étiquettes se chevauchaient | Colonne décalée et rangées espacées ; textes mesurés avec la police réelle : 0 débordement, 0 chevauchement |
| Image de partage : le texte « À retenir » débordait sur la ligne du bas | Nombre de lignes limité à la place disponible, avec points de suspension |
