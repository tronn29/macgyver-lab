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

## Lecture déclarée et quiz : vérifications et corrections

Testé sur téléphone (375 × 812) avec de **vrais appuis** dans le navigateur (et non en appelant le code directement) : cocher et décocher « Lu », la liste « Lues », l'accueil, la progression, la série ; puis le quiz complet (mauvaise réponse, bonne réponse, question suivante au doigt et au clavier, « Terminer », bilan, « Recommencer », sans-faute, rechargement), ainsi que le défi du jour.

| Bug | Cause | Correction |
|---|---|---|
| **« Valider » ne faisait rien** (quiz des fiches, du défi du jour et de la révision) | Le bouton était de type `button` : il ne soumettait pas le formulaire. Les tests précédents soumettaient le formulaire par programme et ne pouvaient pas le voir. | Bouton de type `submit`. Nouveau test dans un vrai DOM (happy-dom) qui **clique** les boutons. Vérifié : il échoue sans le correctif et réussit avec. |
| Pas de « Recommencer » ni de bilan en fin de quiz | Fonction absente | Bilan + « Recommencer le quiz » |
| Score du quiz non enregistré pour la fiche | Seules les statistiques par catégorie étaient gardées | Dernier score, meilleur score, tentatives, conservés et affichés |
| La réponse fausse choisie restait en cyan « sélectionné » ; correction perceptible par la seule couleur | Priorité CSS du style « coché » | Style rouge prioritaire + étiquettes « Ta réponse » / « Bonne réponse » |
| La fiche se marquait lue toute seule à l'ouverture (8 s ou défilement) | Marquage automatique | Remplacé par la case « Lu » |
| « Voir le schéma » recouvrait la correction du quiz | Visible jusqu'en bas de la fiche | Masqué une fois le texte dépassé |
| Le masquage du bouton ratait les sauts de défilement | `IntersectionObserver` ne signale que les changements de visibilité | Calcul de position au défilement |
| Régression pendant la correction : lettre et texte des réponses sur deux lignes | `flex-wrap` ajouté pour l'étiquette | Grille : lettre à gauche, texte à droite, étiquette en dessous |

Tests : 54 (7 nouveaux : case « Lu », score enregistré, quiz cliqué dans un vrai DOM). Contraste de la case « Lu », du quiz corrigé et du score : 0 échec dans les 2 thèmes (minimum 5,4:1).

## Contenu et style (révision 3) : vérifications et corrections

- Validateur : contenu valide, **0 avertissement** d'ordre de grandeur sur les 22 fiches (170 ordres de grandeur, liste dans `ORDRES-DE-GRANDEUR.md`).
- Tests : 60 (nouveaux : détecteur d'ordres de grandeur, fiche CO₂ sans valeur non prononcée, quiz CO₂ couvrant les comptes et le pourquoi physique, étiquette et sécurité conservées). Le test du texte mot pour mot utilise le nouveau texte.
- Affichage vérifié sur téléphone en portrait (375 × 812 et un écran très étroit de 268 px) et en paysage (812 × 375) : fiche CO₂, cabestan (échelle), poulie (données clés). Les 22 fiches s'affichent sans erreur ni débordement horizontal.
- Contraste : 0 échec dans les 2 thèmes sur 5 fiches représentatives. Titres sans saut.
- Schéma CO₂ : 31 textes mesurés avec la police réelle : aucun débordement, aucun chevauchement.

| Défaut trouvé | Correction |
|---|---|
| Sur un écran étroit, les boutons favori et partage serraient le titre, coupé en plein mot (« Extincte / ur ») | Les boutons passent sur la ligne du sur-titre ; le titre prend toute la largeur, avec césure en français |
| L'équivalent concret des données clés s'affichait en police à chasse fixe | Police de texte |
| Glace sèche : « le CO₂ froid est 1,5 fois plus dense que l'air » (vrai seulement à température égale) | Formulation corrigée |
| Deux tirets demi-cadratins dans des intervalles de valeurs | Remplacés par « à » |
| Étiquettes du schéma CO₂ trop serrées (environ 1 unité de chevauchement) | Interlignes élargis |

## Éditeur de fiches et de fonctions : vérifications et corrections

- Tests : 86 (14 nouveaux : conversion des paragraphes, superposition sans toucher aux 22 fiches, lecture, favori, recherche et suppression avec ses traces, fiche sans quiz hors révision, stockage abîmé, identifiants, fonction avec objet du catalogue et objet nouveau, export accepté par `modele:verifier` une fois les crochets remplacés, règle de contenu, formulaire réel : refus vide, aperçu sans trace, enregistrement).
- Parcours complet dans un vrai navigateur, au clavier, sur téléphone (375 × 812) : créer une fiche (accroche, série et réalité, À retenir, question), aperçu, enregistrement, case « Lu », favori, quiz, liste « Mes fiches », accueil, statistiques, recherche, révision, modification, export, suppression ; même chose pour une fonction. Version de production vérifiée aussi (schéma par défaut chargé, aucune erreur).
- Contraste : 0 échec dans les thèmes sombre, clair et contraste élevé (listes, fiche et fonction perso, formulaires avec erreurs, aperçu, export, réglages).
- Accessibilité du formulaire : chaque champ a une étiquette, aucun identifiant en double, titres sans saut (h1, h2 par section, h3 par paragraphe ou question), cases « bonne réponse » de 24 px avec un nom distinct (« Réponse 2 »).
- Paysage (812 × 375) et grand écran (1280 × 800) : aucun débordement horizontal sur les pages de l'éditeur.

| Défaut trouvé | Correction |
|---|---|
| Archives en paysage : la rangée de filtres élargissait toute la page (défaut déjà présent) | Colonne de la barre d'outils limitée à la largeur de la page |
| Les boutons « Créer une fiche » et « Surprends-moi » recouvraient le sur-titre sur téléphone | Boutons avec texte placés sous le titre sur petit écran |
| Une fiche sans quiz aurait cassé la révision espacée | La révision ignore les fiches sans question |
| Carte perso : catégorie, « Ma fiche » et « Lu » serrés sur une ligne | « Ma fiche » sur sa propre ligne |
| Champs de réponse du quiz trop étroits sur téléphone | Bouton « Retirer » déplacé sous le champ |
| Aperçu : défilement animé jusqu'en haut, plus d'une seconde | Défilement immédiat |
| Export : moins de 4 paragraphes et nom de schéma signalés comme erreurs de format | Paragraphes à remplir ajoutés ; un seul message par texte entre crochets |

## Cinq fiches « serrures et sécurité » : vérifications

- Validateur : contenu valide, 27 fiches, 71 termes ; 2 avertissements (accroche « Peu de gens savent » absente des textes fournis de la porte et du fusible).
- Tests : 89 (nouveaux : texte fourni mot pour mot hors des 4 corrections listées, structure du format long, schéma, quiz et nuance de chaque fiche).
- Schémas mesurés avec la police réelle : aucun texte hors cadre ni chevauchement (corrigés : 3 paires d'étiquettes trop serrées, une légende qui coupait le cercle du zoom, un arc en pointillés qui traversait les étiquettes de la porte).
- Téléphone en portrait (375 × 812) et en paysage (812 × 375) : aucun débordement ; contraste : 0 échec en thème sombre et clair ; la recherche trouve chaque fiche (« serrure », « cadenas », « fusible », « scier barreau », « bloquer porte ») et les liens sont symétriques (la fiche du levier renvoie vers la porte).

## Fiches 6 à 10 : vérifications

- Validateur : 30 fiches, contenu valide, 5 avertissements d'accroche (textes fournis). Un ordre de grandeur non prononcé dans un nouveau quiz du levier (« 2 m », « 0,2 m ») a été corrigé.
- Tests : 91 (texte fourni mot pour mot hors des 7 corrections listées ; levier et poulie au format long sans changement d'identifiant, toujours cités par les parcours).
- Schémas mesurés avec la police réelle : corrigés une légende hors cadre et deux étiquettes serrées (chewing-gum) ; retirés une coche qui empiétait sur l'échelle de température et une animation de rotation trompeuse sur les flèches des poulies.
- Téléphone en portrait et en paysage : aucun débordement ; contraste : 0 échec en thème sombre et clair ; liens symétriques vérifiés (le frottement renvoie vers levier, poulie et courroie) ; parcours intacts.

## Fiches 11 à 15 : vérifications

- Validateur : 34 fiches, 73 termes, contenu valide, 8 avertissements d'accroche (textes fournis).
- Tests : 93 (texte fourni mot pour mot hors de la correction listée ; lentille au format long avec son expérience liée).
- Schémas mesurés avec la police réelle : corrigés deux étiquettes hors cadre et une flèche qui traversait « calculateur » (voiture), une étiquette sur la flèche (détecteur), une légende plus large que son encadré et deux paires d'étiquettes serrées (pile, radio).
- Téléphone en portrait et en paysage : aucun débordement ; contraste : 0 échec en thème sombre et clair.

## Fiches 16 à 27 : vérifications

- Validateur : 42 fiches, 75 termes, contenu valide, 16 avertissements d'accroche (textes fournis).
- Tests : 96 (texte fourni mot pour mot hors des 4 corrections listées ; fuite de gaz et suture classées rouge, fuite de gaz en principe seul ; eau solaire et boussole au format long avec leurs expériences).
- Schémas mesurés avec la police réelle : corrigés une étiquette hors cadre et une collision (pile), un titre trop long qui touchait la pastille voisine et une étiquette sur l'encadré (gaz), une étiquette sur le séparateur (pile), deux en-têtes trop proches (citron).
- Téléphone en portrait et en paysage : aucun débordement ; contraste : 0 échec en thème sombre et clair.

## Ordres de grandeur et niveau de sécurité : vérifications

- Validateur : 42 fiches, contenu valide, 0 avertissement d'unité, 16 avertissements d'accroche (textes fournis, inchangés).
- Tests : 103 (aucune parenthèse superflue ni prononciation manquante sur toutes les fiches, `dit` seulement pour les valeurs difficiles, niveau de sécurité seul, validateur qui bloque une note de sécurité).
- Téléphone en portrait et en paysage : encadré Sécurité réduit au niveau, données clés et échelle de frottement correctes, éditeur sans champ « Précaution », aucun débordement.
