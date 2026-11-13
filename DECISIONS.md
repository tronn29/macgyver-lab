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
