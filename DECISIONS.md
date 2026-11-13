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
