# Décisions

Décisions prises sans consultation, avec leur raison. Chacune peut être revue.

## Technique

| Décision | Raison |
|---|---|
| **Vite + TypeScript, sans framework** | Bundle léger (≈ 48 Ko de JS compressé), démarrage rapide, aucune dépendance d'exécution. Un mini-outil `h()` construit le DOM sans `innerHTML` pour les données (pas d'injection possible). |
| **Routage par ancre `#/…`** | Fonctionne sur GitHub Pages et Netlify sans règle de réécriture, dans un sous-dossier, et hors connexion. |
| **Contenu dans `public/content/fr/*.json`, chargé à l'exécution** | Le contenu reste séparé du code : on l'édite sans recompiler. `index.json` liste les fichiers de chaque collection, donc on peut répartir le contenu en plusieurs fichiers (ex. `theorie-perso.json`). |
| **Schéma JSON + validateur maison (`npm run validate`)** | Contrôle le format (Ajv), les identifiants, les liens croisés, le glossaire, les SVG, les règles des missions et la règle de sécurité. Il bloque `npm run build` en cas d'erreur. |
| **SVG externes, nettoyés puis insérés dans la page** | Ils héritent des couleurs du thème (variables CSS) et partagent un seul jeu de marqueurs (flèches, points, cotes) et un halo lumineux. Aucune couleur n'est écrite en dur, ce qui assure la cohérence et le thème clair automatique. |
| **viewBox commune 360 × 240** | Même proportion pour tous les schémas, lisible sur téléphone et agrandissable en plein écran. |
| **Service worker écrit à la main, généré au build** | Liste de pré-cache exacte (58 fichiers, ≈ 1 Mo) et version calculée sur le contenu. Le contenu et la page passent par le réseau d'abord, avec un délai de 3,5 s puis repli sur le cache : les mises à jour arrivent vite. Les fichiers versionnés passent par le cache d'abord. Pas de Workbox : moins de code et un comportement maîtrisé. |
| **Polices servies localement (@fontsource)** | Fonctionnent hors connexion. Aucun appel à Google Fonts (RGPD). Seul le sous-ensemble latin est pré-caché. |
| **Typographies** | *Chakra Petch* pour les titres (géométrique, coupes tactiques, sans lien avec la typographie de la série), *Inter* pour le texte, *JetBrains Mono* pour les données. Toutes sous licence OFL. |
| **Icônes dessinées à la main (≈ 120)** | Jeu cohérent (trait 1,6, bouts arrondis) sur le thème de l'outillage et de la technologie. Pas d'emoji ; un test le vérifie. |
| **Icônes PNG générées par script (`npm run icons`)** | Rendu par champ de distance et encodeur PNG maison : aucune dépendance native. Emblème original (hexagone, réticule). |
| **localStorage versionné avec migration** | Clés `mgl:progress` et `mgl:settings`. Une progression corrompue ou ancienne est réparée au chargement. Si le stockage est indisponible (navigation privée), l'appli bascule en mémoire et prévient. |
| **i18n** | Tous les textes d'interface sont dans `src/i18n/fr.json`, avec pluriels et paramètres. Un test vérifie que chaque clé utilisée existe. Le contenu est déjà rangé par langue (`content/fr/`). |
| **CSP stricte dans `index.html`** | `default-src 'self'` : aucune ressource externe ne peut être chargée. |
| **`noindex`** | Appli privée : `robots.txt` et une balise meta demandent aux moteurs de recherche de ne pas l'indexer. |

## Produit

| Décision | Raison |
|---|---|
| **Score des missions sur 100 : objets /40, logique /40, rigueur /20** | La logique pèse autant que le choix des objets. Le joueur est évalué face à la solution qui lui correspond le mieux, donc plusieurs solutions sont valables. Seuil de réussite : 60. |
| **Logique = idées clés retrouvées dans le texte** | Chaque solution définit des groupes de synonymes. La comparaison ignore accents et casse et tolère pluriels et conjugaisons. Comme une analyse de texte simple ne peut pas tout reconnaître, le rapport propose une **auto-évaluation honnête** (« ma solution est différente mais valable »), qui relève la logique à 30/40 au minimum et reste marquée dans l'historique. |
| **Indices : −5, −10, −15** | Le coût monte avec la précision. Ils se débloquent dans l'ordre (principe, objets, méthode). |
| **Pénalités** | −5 par leurre sélectionné, −2 par objet hors sujet au-delà de 2 : cela évite la stratégie « tout sélectionner ». |
| **Compte à rebours optionnel** | Bonus de +5 si le temps est respecté. Le dépassement n'est pas éliminatoire : on apprend même sous pression. Pause possible. |
| **Révision espacée de type Leitner** | 6 boîtes, intervalles de 1, 2, 4, 8, 16 et 32 jours. Une fiche lue entre en boîte 0 ; une erreur la renvoie en boîte 0. Système simple, transparent et efficace. |
| **Fiche « lue » après 8 s ou en arrivant à « Pourquoi ça marche »** | Évite de compter une fiche simplement survolée. |
| **Défi du jour : 3 questions tirées de façon déterministe par date** | Le même défi pour toute la journée, même hors connexion. |
| **Série de jours** | Toute activité compte (lecture, quiz, expérience, mission). La série est signalée « en danger » le lendemain d'une activité sans activité du jour. |
| **Niveaux et XP** | 10 niveaux nommés (de « Recrue » à « Légende du terrain »), XP modestes pour ne pas transformer l'apprentissage en course. |
| **Points faibles** | Moyenne des scores de mission et du taux de bonnes réponses par catégorie. Une catégorie n'est signalée qu'à partir de 3 réponses ou d'une mission. |
| **Missions présentées par zones** | Plutôt qu'une illustration de pièce par mission (lourde à produire, peu accessible), une « vue scan » par zones avec tuiles d'objets. Elle reste accessible au clavier et au lecteur d'écran, avec une vue liste détaillée en option. |
| **Rapport de mission recalculé** | Seuls la sélection, le texte et les indices sont stockés ; l'analyse est recalculée à l'affichage, donc toujours à jour si le contenu évolue. |
| **Brouillon de mission** | La sélection, le texte, les indices et le temps sont gardés si on quitte : bouton « Reprendre l'opération en cours ». |
| **Nom « MacGyver Lab »** | C'est le nom demandé pour cet usage privé. Aucun logo, aucune police de titre, aucune image, aucun nom de personnage ni d'organisation de la série n'est utilisé. Seule l'ambiance (thriller tactique moderne) est reprise. |

## Contenu et sécurité

- **Règle non négociable appliquée par le validateur** : une fiche `principeSeul` doit être en sécurité rouge et ne propose aucune expérience ; aucune expérience Pratique ne peut être en rouge ; aucune expérience ne peut être liée à un sujet sensible.
- Sujets sensibles traités au niveau du principe uniquement : *Bobine et pic de tension* (auto-induction, loi de Lenz) et *Poussières et combustion rapide* (surface spécifique, prévention industrielle). Aucun montage, aucune quantité, aucune liste de composants.
- *Énergie cinétique et fronde* reste au niveau de la physique (½mv², vitesse tangentielle), sans dimensions ni fabrication.
- Le canon à anneaux utilise la brume d'un humidificateur, jamais de fumée. La fusée à eau est limitée à 3 bar et doit être faite avec un adulte.
- Missions : solutions sans flamme en espace clos, sans électricité du secteur, sans forcer de mécanisme dangereux.

## Format long des fiches Théorie (v2)

| Décision | Raison |
|---|---|
| **Nouveau champ `texte` : liste de paragraphes en texte enrichi** | Un texte qui coule se retient mieux qu'une liste de points. On réutilise le balisage existant (`[[terme]]`) et on ajoute `**gras**`. Le gras qui ouvre un paragraphe devient sa phrase d'accroche (mise en couleur). |
| **Compatibilité par la présence du champ** | Une fiche avec `texte` s'affiche au format long ; sans `texte`, l'ancien format (principe en 3 lignes + pourquoi) reste affiché. Le schéma JSON accepte l'un ou l'autre (`anyOf`), ce qui permet de migrer fiche par fiche. |
| **Blocs masqués dans le format long** | « Principe en 3 lignes », « Pourquoi ça marche », « Données clés » et l'explication séparée de « Série ou réalité ? » ne s'affichent plus : le texte les contient. L'étiquette « Série ou réalité ? » (verdict) reste dans l'en-tête et en tête du paragraphe « Dans la série / Dans la réalité », affiché dans un encadré orange. Le niveau de sécurité garde son panneau, avec sa note, après le texte. |
| **« À retenir » en encadré final** | Le dernier paragraphe est obligatoire et conclut ; il est mis en valeur pour la révision. Il sert aussi à l'image de partage et au mode enfant de la lecture vocale. |
| **Temps de lecture calculé** | 200 mots par minute sur le texte affiché, arrondi à la minute supérieure, affiché en haut de la fiche et sur les cartes. `duree` devient facultatif. |
| **Mise en page de lecture** | Corps de 17 à 18 px, interligne de 1,75, largeur de ligne limitée à environ 40 caractères em (65 à 75 signes), paragraphes espacés de 1,4 ligne. |
| **Schéma à portée sans quitter le texte** | Sur ordinateur et en paysage, le schéma reste épinglé à gauche du texte. Sur téléphone en portrait, un bouton flottant « Voir le schéma » apparaît dès que la figure est sortie de l'écran, et ouvre le schéma agrandi. Il disparaît quand la figure est visible. |
| **Fiche lue** | Marquée lue en arrivant à « À retenir », ou après un délai proportionnel au temps de lecture (30 s par minute, 20 s au minimum). |
| **Validateur** | Il exige « À retenir » en dernier et un paragraphe « Dans la série / Dans la réalité », et vérifie la fermeture du gras. Il avertit en cas d'absence de « Peu de gens savent que… », de tiret cadratin ou de liste à puces. La règle de contenu est renforcée : termes de fabrication d'armes ou d'explosifs bloqués dans tout le contenu ; quantités de matière et vocabulaire de montage bloqués dans les sujets sensibles. |
| **Fiche CO₂ migrée** | Texte fourni repris mot pour mot ; un test le compare au fichier témoin `tests/fixtures/fiche-co2.md`. Les infobulles utilisent la forme `[[id|texte affiché]]`, ce qui ne change pas le texte lu. Schéma redessiné : triangle du feu, quatre types d'extincteurs et ce que chacun retire, détente du CO₂ en neige à −78 °C. Une question de quiz ajoutée sur le choix de l'extincteur. |

## Lecture déclarée et quiz enregistrés

| Décision | Raison |
|---|---|
| **Case « J'ai lu cette fiche », jamais de marquage automatique** | C'est toi qui sais si tu as vraiment lu. La case (vraie case à cocher, accessible au clavier) se trouve juste après le texte. L'état apparaît dans l'en-tête de la fiche, sur les cartes de la liste (« Lu » / « Nouveau »), dans le filtre « Lues », sur l'accueil et dans la progression. |
| **Cocher** | +10 XP, la fiche entre dans la révision espacée et l'action compte pour la série du jour. |
| **Décocher** | Les 10 XP sont retirés et la fiche sort de la révision (son historique de révision repart de zéro si tu la recoches), pour qu'on ne puisse pas gonfler l'XP en cochant et décochant. La série déjà validée ce jour-là n'est pas retirée : l'activité a bien eu lieu. |
| **Ouvrir une fiche ne compte plus pour la série** | Seules les actions comptent : cocher « Lu », répondre à un quiz, une expérience, une mission, le défi. |
| **Score de quiz enregistré par fiche** | Dernier score, meilleur score et nombre de tentatives, affichés au-dessus du quiz et conservés sur l'appareil. Chaque réponse continue d'alimenter les statistiques par catégorie (points faibles). |
| **Bilan et « Recommencer le quiz »** | À la fin, un bilan donne le score et propose de recommencer depuis la question 1. |
| **Correction lisible sans la couleur** | La bonne réponse porte l'étiquette « Bonne réponse » (ou « Ta réponse, juste ») et la réponse fausse choisie « Ta réponse ». Le texte double la couleur (WCAG 1.4.1). |
| **Bouton « Voir le schéma »** | Visible seulement pendant la lecture du texte (schéma passé au-dessus de l'écran, case « Lu » pas encore atteinte). Sa visibilité est calculée à chaque défilement, une fois par image. |

## Contenu et style des fiches (révision 3)

| Décision | Raison |
|---|---|
| **Fiche CO₂ : texte fourni repris mot pour mot** | 11 paragraphes, 860 mots (5 min de lecture). Le test compare toujours le texte affiché au fichier témoin `tests/fixtures/fiche-co2.md`, mis à jour. Les infobulles (`[[id|texte affiché]]`) ne changent pas le texte lu. |
| **Quiz CO₂ : 6 questions** | Ajout : nombre d'éléments du feu (3), nombre de types d'extincteurs (4), pourquoi un gaz qui se détend se refroidit, pourquoi la température se bloque à −78,5 °C. Conservées : l'extincteur pour un ordinateur, le barreau épais. La question « Pourquoi le jet est glacé ? » est fusionnée avec celle sur la détente. Le format accepte désormais jusqu'à 8 questions par fiche. |
| **Schéma CO₂ redessiné en 3 zones** | 1 : triangle du feu. 2 : les 4 extincteurs, chacun avec ce qu'il retire (« − chaleur », « − réaction », « − oxygène ») et où on le trouve. 3 : bouteille à 57 bar et 20 °C avec molécules serrées, détente, neige carbonique à −78,5 °C. Textes mesurés avec la police réelle : rien ne déborde ni ne se chevauche. |
| **Prononciation dans le texte, pas dans les schémas** | Dans les fiches, chaque ordre de grandeur est suivi de sa prononciation entre parenthèses et d'un équivalent concret. Les étiquettes des schémas restent courtes pour rester lisibles ; leur texte alternatif, lu par les lecteurs d'écran, donne les valeurs prononcées. |
| **Données clés : champs `dit` et `concret`** | Plutôt que d'alourdir l'étiquette, chaque donnée clé a sa prononciation (affichée sous la valeur) et son équivalent concret (une phrase). |
| **Quiz : prononciation seulement dans les choix** | Les choix restent courts ; l'équivalent concret est dans l'explication. |
| **Bloc `echelle`** | Un nouveau bloc gradué (valeur, prononciation, description), affiché dans les deux formats de fiche. Il sert à l'échelle des coefficients de frottement du cabestan et pourra servir à d'autres grandeurs. Une barre de couleur passe du cyan à l'orange pour situer chaque niveau. |
| **Avertissement du validateur, sans blocage** | Le module `scripts/magnitudes.mjs` repère les valeurs avec unité, les valeurs de symbole (μ = 0,3), les facteurs (×6,6) et les puissances de dix. Il avertit si la valeur n'est pas suivie d'une parenthèse de prononciation, ou si une donnée clé n'a pas `dit` ou `concret`. Les valeurs d'un même intervalle (« 0,4 à 0,6 ») partagent la même parenthèse. Les tests vérifient le détecteur et la fiche CO₂ (zéro manque), sans faire échouer la publication sur les autres fiches. |
| **Longueur cible des fiches** | 500 à 900 mots (3 à 5 minutes), alignée sur la fiche de référence. |

## Fiche empreintes digitales (format long)

| Décision | Raison |
|---|---|
| **Texte fourni repris mot pour mot** | 4 paragraphes au format long. Un test le compare au fichier témoin `tests/fixtures/empreintes-poussiere.md`. Infobulles ajoutées sans changer le texte lu : « optiques » (capteur d'image), « capacitifs » (nouveau terme du glossaire : *capteur capacitif*), « conductivité » (conducteur). |
| **Titre élargi : « Empreintes digitales, poudre et capteurs »** | La fiche parle maintenant autant des lecteurs que de la poudre. L'identifiant (`empreintes-poussiere`) ne change pas, donc la progression, les liens et les favoris sont conservés. |
| **Étiquette « Série ou réalité ? » : verdict « partiel » + nuance** | Nouveau champ facultatif `realite.nuance`, une précision courte affichée avec l'étiquette dans l'en-tête et dans l'encadré « Dans la série / Dans la réalité » : « Marchait sur les anciens capteurs optiques, plus sur les capteurs modernes ». Il servira à toute fiche dont la réponse dépend de l'époque ou du cas. |
| **Anciennes données clés retirées** | Le format long n'affiche pas les données clés, et le texte fourni ne contient aucun ordre de grandeur. Le texte ne produit donc aucun avertissement. |
| **Quiz de 5 questions** | Poudre et film gras ; capteur optique contre capteur capacitif ; pourquoi un adhésif ne trompe plus un téléphone (conductivité) ; ce que vérifient les capteurs récents (pouls, circulation sous l'ongle, température) ; quels lecteurs un moule pouvait tromper. |
| **Schéma redessiné en 4 zones** | 1 : film gras et poudre. 2 : empreinte relevée sur adhésif. 3 : capteur optique (lampe, prisme, caméra : « faux doigt : trompé »). 4 : capteur capacitif (électrodes, champ électrique : « peau vivante : lue », « adhésif : invisible », « + pouls, température »). Textes mesurés avec la police réelle : rien ne déborde ni ne se chevauche. |
| **Sécurité verte conservée** | Relever ses propres empreintes avec du cacao ou du talc est sans danger. |
| **Règle de contenu** | La fiche explique pourquoi un faux doigt ne fonctionne plus, sans mode d'emploi pour en fabriquer un ni pour contourner un capteur. |

## Modèles de contenu

| Décision | Raison |
|---|---|
| **Un modèle = un fichier à sections** (`theorie` + `glossaire`, `equivalences` + `objets`, `pratique`, `missions` + `objets`) | Une fiche a souvent besoin d'un nouveau terme du glossaire ; une fonction ou une mission, d'un nouvel objet. Tout se remplit au même endroit, puis chaque section part dans sa collection. |
| **Textes indicatifs entre crochets simples `[ … ]`** | Faciles à repérer et impossibles à confondre avec les termes du glossaire `[[id|texte]]`, qui restent valides dans les modèles. Un nombre ou un vrai/faux à écrire sans guillemets est indiqué en toutes lettres dans le texte indicatif. |
| **`_modeles/` exclu du build et du validateur** | Le plugin de build supprime `dist/content/*/_modeles/` avant le calcul du cache hors ligne et échoue s'il n'y arrive pas. Le validateur ne lit que les fichiers déclarés dans `index.json`, et refuse explicitement qu'un fichier de `_modeles/` y soit déclaré. |
| **Page cachée `#/modeles`, chargée à la demande** | Les modèles sont embarqués au build par un module virtuel (`virtual:modeles`), uniquement dans le fichier JavaScript de cette page (8,6 Ko compressés). Le reste de l'appli ne grossit pas, et la page fonctionne hors connexion. Aucun menu, aucune recherche, aucune liste ne la mentionne. |
| **Aperçu avec les vraies vues** | La page appelle les vues réelles (fiche, fonction, expérience, briefing et terrain de mission) sur une version d'aperçu de chaque modèle. Les textes entre crochets restent visibles ; les valeurs techniques prennent une valeur d'exemple valide. Les objets et liens cités en exemple (« ex. : papier-alu ») sont remplacés par les vrais quand ils existent. |
| **L'aperçu ne touche jamais la progression** | Les identifiants d'aperçu commencent par `_modele` : lecture, quiz, favoris, expériences, série et « Reprendre » les ignorent (vérifié : répondre au quiz de l'aperçu ne modifie rien). Les commandes qui écriraient (favori, case « Lu », carnet, lancement de mission) sont visibles mais désactivées. Le quiz reste jouable pour voir la correction. |
| **Un seul titre principal sur la page** | Les titres des aperçus sont lus comme des titres de niveau 2, avec le même style visuel. Le titre et les indices de la mission ne sont pas répétés entre le briefing et le terrain. |
| **Schéma d'exemple `public/schemas/modele-exemple.svg`** | Un dessin générique qui respecte la charte (3 étapes numérotées, flèches, encadré, cote, chaud et froid) avec des textes entre crochets, à dupliquer pour chaque nouveau schéma. Le validateur le vérifie comme les autres sans le signaler comme inutilisé. |
| **Outil `npm run modele:verifier` / `modele:ajouter`** | La vérification liste en français les crochets restants, les champs obligatoires manquants, les mauvais formats, les identifiants pris et les liens inconnus, avant même le validateur. L'ajout écrit dans des fichiers `*-perso.json`, déclarés dans `index.json`, ce qui ne touche pas au contenu existant ; il annule tout si le validateur refuse. |

## Éditeur de fiches et de fonctions dans l'appli

| Décision | Raison |
|---|---|
| **Contenu perso stocké à part (`mgl:perso`), jamais dans les fichiers officiels** | Les 22 fiches et 12 fonctions validées ne sont jamais modifiées. Le contenu perso est superposé au contenu chargé (tables par identifiant, index « fonctions par objet ») ; les listes officielles restent intactes, ce que vérifient les tests et une vérification dans le navigateur (22 fiches, 12 fonctions, 119 objets après enregistrement). |
| **Identifiants préfixés `perso-`** | Aucune collision possible avec une fiche officielle ; la suppression refuse tout identifiant non perso. Les nouveaux objets d'une fonction perso sont `perso-objet-…`. |
| **Un formulaire, aucun JSON** | Titre, sous-titre, catégorie (liste des 9 catégories), étiquette « Série ou réalité ? » (vrai, partiel, faux) et sa nuance (90 caractères au plus, avec compteur), niveau de sécurité et précaution, paragraphes, quiz, image, version pour enfant. |
| **Paragraphes typés, gras automatique** | Chaque paragraphe a un type : « avec une accroche en gras », « simple », « Dans la série / Dans la réalité » (deux champs) ou « À retenir ». L'appli produit elle-même le texte enrichi du format long (`**…**`) : la fiche s'affiche exactement comme une fiche officielle, encadré « Série ou réalité ? » et « À retenir » compris. Les astérisques tapés à la main sont retirés. « À retenir » est toujours placé en dernier. Monter, descendre et supprimer (avec « Annuler ») pour chaque paragraphe. |
| **Champs obligatoires réduits au minimum** | Titre, catégorie et un paragraphe. Le reste est facultatif : sans quiz, la fiche n'a pas de bloc quiz ; sans version pour enfant, pas de bouton « Explique-moi » ; sans précaution, l'encadré Sécurité n'affiche que le niveau. Un conseil rappelle qu'une fiche complète contient « Dans la série / Dans la réalité » et « À retenir », sans bloquer. |
| **Quiz : 2 à 4 réponses, une case « bonne réponse »** | Jusqu'à 8 questions, comme les fiches officielles. Explication facultative (rien n'est affiché si elle est vide). |
| **Image par défaut `perso-defaut.svg`** | Un carnet de terrain ouvert, un crayon et une ampoule, dessiné avec les classes de la charte (validé comme les autres schémas). On peut aussi reprendre le schéma d'une fiche officielle, avec son texte alternatif. Pas d'import d'image : elle devrait être stockée en local et vérifiée, ce qui alourdirait l'appli pour peu de gain. |
| **Aperçu avec le vrai design** | « Aperçu » affiche la fiche par la vraie vue des fiches, dans la même page (le formulaire reste en mémoire). L'identifiant d'aperçu commence par `_modele` : rien n'est écrit dans la progression ; le quiz reste jouable. |
| **Brouillon automatique** | Chaque saisie est gardée (clé `mgl:perso-brouillon`) ; en revenant sur le formulaire, un bandeau propose de reprendre ou de repartir de zéro. Le brouillon est effacé à l'enregistrement. |
| **Erreurs accessibles** | Résumé en haut du formulaire (titre focalisé, chaque erreur est un bouton qui amène au champ), message sous chaque champ relié par `aria-describedby`, `aria-invalid`. |
| **Règle de contenu appliquée aussi aux fiches perso** | La liste des termes interdits est partagée entre le validateur et l'éditeur (`src/core/regle-contenu.json`). Une fiche qui en contient n'est pas enregistrée, avec un message qui rappelle la règle. |
| **Même statut que les fiches officielles dans la progression** | Case « Lu », XP, favoris, notes, score de quiz, recherche, compteurs de l'accueil, des Archives et des statistiques (nouvel indicateur « Fiches et fonctions écrites »). Les insignes restent calculés sur le contenu officiel (« Archiviste » = les 22 fiches), pour qu'écrire une fiche ne les rende pas plus difficiles. Une fiche sans quiz n'entre pas dans la révision espacée (elle n'a rien à réviser) ; la révision ignore désormais toute fiche sans question. |
| **Sections « Mes fiches » et « Mes fonctions »** | Au-dessus des listes officielles, avec un cadre en tirets orange et la mention « Ma fiche » sur chaque carte. Les filtres et la recherche s'y appliquent aussi. Pas de « fiche précédente / suivante » sur une fiche perso. |
| **Barre Modifier / Exporter / Supprimer** | Sur chaque fiche ou fonction perso. La suppression demande confirmation et efface aussi la lecture, le score, la note et le favori. |
| **Export au format des modèles** | Le texte suit `MODELES.md` (`modele: fiche-theorie` ou `equivalence`), à copier ou télécharger. Ce qu'une fiche officielle exige en plus est ajouté entre crochets : nom du schéma à dessiner, version pour enfant, précaution, mots-clés, explication de quiz, paragraphes manquants (au moins 4, dont « Dans la série / Dans la réalité » avant « À retenir »). `npm run modele:verifier` liste alors seulement les crochets à remplacer ; une fois remplacés, le modèle est accepté (vérifié par un test). |
| **Vérificateur de modèles : un seul message par texte entre crochets** | Un texte entre crochets n'est plus signalé une seconde fois pour son format (ex. : « identifiant invalide » sur `schema.fichier`). |
| **Fonctions perso : objets du catalogue ou nouveaux** | Le nom tapé est cherché dans le catalogue (nom et alias, sans accents ni majuscules : « ruban adhésif » donne « Ruban adhésif toilé ») avec des suggestions ; sinon un objet perso est créé, avec sa propre page. Un même objet ne peut pas apparaître deux fois. |
| **Sauvegarde et effacement** | Le contenu perso est inclus dans l'export de Réglages et restauré par l'import. Réglages > « Supprimer mes fiches et fonctions » efface tout (avec confirmation). La page Confidentialité le mentionne. |
| **Éditeur chargé à la demande** | `editeur.js` (7,6 Ko compressés) n'est téléchargé qu'à l'ouverture du formulaire et reste disponible hors connexion (pré-caché). |

## Cinq fiches « serrures et sécurité »

| Décision | Raison |
|---|---|
| **Textes fournis repris mot pour mot, avec 4 corrections de physique** | Un test compare chaque fiche au texte fourni (`tests/fixtures/serrures-et-securite.md`) et n'autorise que les corrections listées ci-dessous, rien d'autre. Le gras (accroches, « Dans la série », « Dans la réalité », « À retenir ») et les infobulles du glossaire ne changent pas le texte lu. |
| **Correction 1, serrure : quelle goupille se coince** | Le texte disait qu'une seule goupille touche la ligne de cisaillement et que « les autres restent légèrement coincées ». C'est l'inverse : quand le barillet est sollicité en rotation, une seule goupille à la fois se coince, les autres restent libres. |
| **Correction 2, serrure : « goupilles à ressort »** | Toutes les goupilles ont déjà un ressort ; la protection supplémentaire, ce sont les goupilles de sécurité (en champignon ou en bobine) ou les serrures à disques. |
| **Correction 3, serrure : « un trombone plie avant… »** | Devient « plie souvent avant » : un fil fin permet parfois de crocheter une serrure simple ; c'est difficile, pas impossible. |
| **Correction 4, porte : pourquoi le stylo bloque** | Le texte parlait d'un « point de friction énorme ». La vraie raison est le levier, déjà expliqué dans le premier paragraphe : près du pivot, la poussée sur la porte est multipliée et écrase l'objet. « L'espace entre la charnière et son logement » devient « l'interstice côté charnières, entre la porte et le cadre », plus clair. |
| **Règle de contenu respectée** | Les cinq fiches expliquent un principe (goupilles et jeu de fabrication, levier, disques à encoche, fusible, abrasion et dureté) et montrent pourquoi la méthode de la série échoue en réalité. Aucune ne donne de mode d'emploi : pas de technique de crochetage pas à pas, pas de méthode pour couper une alarme. Les notes de sécurité rappellent ce qui est illégal (ouvrir la serrure ou le cadenas de quelqu'un d'autre) ou dangereux (tableau électrique, doigts côté charnières). |
| **Étiquettes « Série ou réalité ? »** | Serrure, porte, cadenas et sciage : « partiel », avec une nuance (le principe est réel, pas en quelques secondes ou pas sur tout). Fusible : « faux », nuancé « seulement sur un appareil basique, sans batterie de secours ». |
| **Sécurité** | Vert pour la serrure et le cadenas (rappel légal), orange pour la porte (doigts écrasés, issues de secours), le fusible (tableau électrique, jamais de fusible plus fort) et le sciage (fil qui coupe, poussières de métal). |
| **5 nouveaux termes du glossaire** | Jeu (mécanique), ligne de cisaillement, fusible, abrasif, dureté. « Bras de levier » et « courant » sont aussi liés aux nouvelles fiches. |
| **Nouveau fichier `theorie-3.json`** | Les 5 fiches sont ajoutées après les 22 existantes, dans l'ordre fourni ; aucune fiche existante n'est modifiée. Version du contenu : 2026.11.2. |
| **Deux avertissements acceptés** | Les textes fournis de la porte et du fusible n'ont pas d'accroche « Peu de gens savent que… ». Le validateur l'indique sans bloquer ; je n'ai pas ajouté de phrase au texte fourni. |
| **Schémas** | Coupe d'une serrure à goupilles (ressorts, coupures alignées, jeu exagéré), porte vue de dessus (bras de levier, stylo écrasé près du pivot), disques d'un cadenas alignés, circuit avec fusible et alarme à batterie de secours, fil abrasif avec zoom sur les grains et échelle de dureté. Textes mesurés avec la police réelle : rien ne déborde ni ne se chevauche. |

## Fiches 6 à 10 : dépannage et mécanique

| Décision | Raison |
|---|---|
| **Levier et poulie : fiches existantes remplacées, pas doublées** | Les textes 7 et 8 traitent les mêmes principes que « Le levier » et « Poulie et palan ». Comme pour la fiche des empreintes, ces deux fiches passent au format long avec les nouveaux textes et titres, en gardant leur identifiant : progression, favoris, parcours, missions et liens restent valides. Leurs schémas sont conservés (ils montrent déjà le bras de levier, la poulie fixe et la poulie mobile) ; l'ancien principe en 3 lignes et les données clés disparaissent, comme pour toute fiche au format long. Leurs anciennes questions de quiz sont gardées et complétées. |
| **Trois nouvelles fiches** | Poivre et fuite de radiateur, chewing-gum et durite, courroie remplacée par un collant ; chacune avec schéma, quiz, version enfant, étiquette nuancée et note de sécurité (moteur chaud, liquide sous pression, courroie en mouvement). |
| **Texte fourni repris mot pour mot, 7 corrections** | Un test compare chaque fiche au texte fourni (`tests/fixtures/depannage-et-mecanique.md`) et n'autorise que ces corrections : « cherche le courant » devient « suit le courant » (le poivre est porté, il ne cherche rien) ; dans « À retenir » du poivre, « le courant ralentit brutalement » contredisait le paragraphe 2 (le flux accélère dans le trou) : les grains se coincent parce que le courant les plaque contre une ouverture plus étroite qu'eux ; citation d'Archimède entre guillemets français ; « en magie » devient « par magie » ; « chacune moins fort » devient « chacune moins chargée » ; durite : « plusieurs dizaines de degrés » sous-estimait la température, le liquide est près de quatre-vingt-dix degrés ; courroie : « avant l'invention des pièces de rechange » devient « à l'époque où une pièce de rechange était difficile à trouver » (les pièces de rechange ont toujours existé). |
| **Étiquettes** | Poivre : vrai, pour un petit trou et jusqu'au garage. Levier : partiel (le bâton casse avant de soulever une voiture). Poulie : vrai, avec la perte par frottement. Chewing-gum et courroie : partiel. |
| **Avertissements acceptés** | Les textes fournis du levier, de la poulie et du chewing-gum n'ont pas d'accroche « Peu de gens savent que… » (5 avertissements au total avec la porte et le fusible). Je n'ajoute pas de phrase au texte fourni. |

## Fiches 11 à 15 : électricité, ondes et optique

| Décision | Raison |
|---|---|
| **Lentille : fiche existante remplacée, pas doublée** | Le texte 15 traite le même sujet que « Lentille avec une bouteille d'eau ». Comme pour le levier et la poulie, la fiche passe au format long avec le nouveau titre et le nouveau texte, en gardant son identifiant, son schéma, son expérience liée (loupe à goutte d'eau) et ses questions de quiz, complétées. |
| **Quatre nouvelles fiches** | Contact de voiture et antidémarrage, détecteur à fil, pile à plat, onde radio et métal ; chacune avec schéma, quiz, version enfant, étiquette nuancée et note de sécurité. 2 nouveaux termes du glossaire : antidémarrage électronique, cage de Faraday. |
| **Une seule correction de physique** | Détecteur à fil : le texte disait que le circuit « reste ouvert tant que rien ne le touche », puis que casser le fil « rompt le contact ». C'est contradictoire : un fil intact ferme le circuit, le casser l'ouvre, et c'est ce changement d'état qui déclenche l'alerte. Le test « mot pour mot » n'autorise que cette correction (2 passages). |
| **Règle de contenu** | Voiture : le texte explique ce qu'est un contact et pourquoi l'antidémarrage rend la méthode inutile, sans désigner de fils ni décrire de manipulation. Radio : la fiche explique la différence entre bloquer et brouiller et rappelle que le brouillage est interdit, sans montage. Pile : la note de sécurité interdit de recharger une pile jetable et de chauffer une batterie au lithium. |
| **Étiquettes** | Voiture : partiel (vrai avant les années 2000). Détecteur à fil : vrai. Pile : partiel (quelques minutes, jamais une recharge). Radio : partiel (le métal bloque, mais ce n'est pas un brouillage). Lentille : vrai, avec soleil fort, bouteille ronde et patience. |
| **Avertissements acceptés** | Les textes fournis du détecteur, de la radio et de la lentille n'ont pas d'accroche « Peu de gens savent que… » (8 avertissements au total). Je n'ajoute pas de phrase au texte fourni. |

## Fiches 16 à 27 : survie et sciences

| Décision | Raison |
|---|---|
| **Dix textes reçus, numérotés 16 à 27** | Les numéros 18 et 23 n'étaient pas dans le texte fourni : rien n'a été inventé à leur place. |
| **Eau solaire et boussole : fiches existantes remplacées, pas doublées** | Les textes 26 et 27 traitent les mêmes sujets que « Purifier l'eau avec le soleil » et « Boussole improvisée ». Comme pour le levier, la poulie et la lentille, elles passent au format long avec les nouveaux titres et textes, en gardant leur identifiant, leur schéma, leur expérience liée et leurs anciennes questions de quiz, complétées. |
| **Huit nouvelles fiches** | Fumée de signal, fuite de gaz, attelle, point de suture, poste à galène, encre au citron, pile canette, densité et flottaison ; chacune avec schéma, quiz, version enfant, étiquette nuancée et note de sécurité. 2 nouveaux termes du glossaire : diode, déclinaison magnétique. |
| **Correction 1, fuite de gaz (sécurité)** | Le texte présentait le bouchon de savon sur un raccord comme « une astuce de dépannage reconnue » en camping. Ce qui est reconnu, c'est l'inverse : l'eau savonneuse sert à repérer une fuite (elle fait des bulles), pas à la boucher. La phrase est remplacée par ce fait, le reste du texte (les bons réflexes) est intact. |
| **Corrections 2 à 4, pile canette** | Deux morceaux d'une même canette sont deux fois le même métal : ils ne produisent aucun courant, ce que dit d'ailleurs le premier paragraphe. La cellule devient aluminium face à un fil de cuivre. La tension d'une cellule aluminium et cuivre dans du vinaigre est d'environ un demi-volt, pas un volt. Enfin, une pile au lithium seule n'est qu'une cellule ; ce sont les batteries (d'ordinateur portable, par exemple) qui en empilent plusieurs. |
| **Règle de contenu** | Fumée : explication de la combustion incomplète et du signal de fumée, pas de fumigène ni de composition. Fuite de gaz : sécurité rouge, principe seul (aucune expérience, validateur strict sur les quantités et les montages). Point de suture : sécurité rouge, la fiche explique pourquoi il ne faut pas le faire soi-même et donne les vrais gestes (appuyer, nettoyer, couvrir, appeler le 15 ou le 112). Attelle : rappel de ne jamais remettre un os en place. |
| **Catégories** | L'appli n'a pas de catégorie « secourisme » : l'attelle et la suture sont rangées en mécanique (immobiliser, rapprocher), la suture aussi en chimie (désinfection). Je n'ai pas créé de nouvelle catégorie pour deux fiches. |
| **Avertissements acceptés** | 16 textes fournis au total n'ont pas d'accroche « Peu de gens savent que… ». Je n'ajoute pas de phrase au texte fourni. |

## Ordres de grandeur et niveau de sécurité : règle de style simplifiée

| Décision | Raison |
|---|---|
| **Unités courantes sans parenthèse** | kg, g, mg, t, km, m, cm, mm, m², cm², m³, L, mL, cl, °C, V, A, W, kW, kWh, s, min, h, km/h, m/s et % se lisent sans aide. 62 parenthèses retirées dans les fiches, par exemple « 20 °C (vingt degrés Celsius) » devient « 20 °C ». L'équivalent concret qui suit est gardé. |
| **Unités peu courantes : parenthèse gardée** | bar, hPa, K, N, J, kJ, mA, kV, Ω, µm, nm, μ, les unités composées (W/m², kV/mm, kJ/kg), les formules (2² = 4) et les puissances de dix (10⁻⁸) gardent leur prononciation : 57 bar (cinquante-sept bars) reste ainsi. J'ai classé mA et kV parmi les unités peu courantes, et t (tonne) parmi les courantes. |
| **Facteurs et nombres simples** | « × 12 (fois douze) », « 10 (dix) », « 0,3 (zéro virgule trois) » ou « 2 à 3 (deux à trois) » se lisent naturellement : 12 parenthèses de ce type sont retirées aussi. |
| **Données clés** | Le champ `dit` (prononciation affichée sous la valeur) est retiré pour 21 valeurs courantes (−78,5 °C, ≈ 550 L, ≈ 10 m, 1831…). Il reste pour les valeurs difficiles à lire (≈ 570 kJ/kg, 1 013 hPa, μ = 0,3). L'équivalent concret reste obligatoire. |
| **Validateur** | Il avertit dans les deux sens : unité peu courante sans prononciation, et parenthèse de prononciation après une unité courante (repérée parce qu'elle commence par un nombre en lettres ; une parenthèse d'explication comme « 10 m (la hauteur de trois étages) » n'est pas visée). Même logique pour `dit`. Des tests vérifient que toutes les fiches respectent la règle. |
| **Textes fournis** | Les tests « mot pour mot » (fiche CO₂) appliquent la nouvelle règle au texte d'origine avant la comparaison : seules ces parenthèses changent, tout le reste est identique. |
| **Niveau de sécurité seul** | La phrase de commentaire à côté du niveau est retirée des 42 fiches (par exemple « Près de l'eau, un adulte surveille toujours les enfants »). L'encadré Sécurité n'affiche plus que le niveau. Le champ `securite.note` n'existe plus pour une fiche : le schéma de contenu le refuse et le validateur le bloque. L'éditeur de fiches personnelles n'a plus le champ « Précaution » ; une ancienne fiche personnelle qui en avait un l'ignore simplement. |
| **Hors fiches : inchangé** | Les expériences du Labo gardent leur note, qui ouvre leur liste de précautions (ce n'est pas un commentaire du niveau, ce sont les consignes de l'expérience). Les fonctions de l'Arsenal gardent aussi leur avertissement. Le bandeau « sujet sensible : principe seulement » des fiches rouges est gardé, car il applique la règle de contenu. Les bons réflexes de sécurité qui comptent (fuite de gaz, suture, attelle) restent dans le texte des fiches. |
