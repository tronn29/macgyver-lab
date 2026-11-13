# Liste des tâches

## Phase 1 — Fondations
- [x] Initialiser le projet (Vite, TypeScript, polices locales, Ajv, Vitest)
- [x] Système de design : jetons (couleurs sombre et clair, typographies, espacements, rayons, mouvement)
- [x] Charte des schémas SVG (classes, marqueurs partagés, animations)
- [x] Format JSON du contenu + schéma (`schema/content.schema.json`)
- [x] Guide du contenu (`CONTENU.md`)
- [x] Architecture : cœur (contenu, routeur, i18n, stockage, score, révision, recherche, progression), interface, vues
- [x] `DECISIONS.md`

## Phase 2 — Construction
- [x] Coquille : barre supérieure, navigation adaptative (barre basse, rail en paysage, rail complet), focus, annonces
- [x] i18n (`src/i18n/fr.json`), pluriels et paramètres
- [x] Stockage local versionné, migration, repli en mémoire, export / import / effacement
- [x] Jeu d'icônes vectorielles (≈ 120)
- [x] Accueil (poste de commandement)
- [x] Archives : liste filtrable, fiche complète, quiz, glossaire, mode enfant
- [x] Arsenal : fonctions, objets, recherche
- [x] Laboratoire : liste, protocole à cocher
- [x] Opérations : briefing, scan, indices, chrono, solution, score, rapport, historique, brouillons
- [x] Recherche globale, glossaire, favoris
- [x] Défi du jour, révision espacée, parcours
- [x] Progression : statistiques, points faibles, insignes
- [x] Réglages, confidentialité
- [x] Partage d'une fiche en image
- [x] Contenu : 22 fiches + 22 schémas, 119 objets, 12 fonctions, 11 expériences + 11 schémas, 6 missions, 65 termes, 5 parcours, 9 catégories
- [x] Validateur de contenu
- [x] Service worker, manifeste, icônes générées

## Phase 3 — Audit technique
- [x] Tests unitaires (34)
- [x] Parcours automatique des 203 pages et des 139 liens internes
- [x] Débordements de texte des 33 schémas
- [x] Portrait, paysage, tablette, ordinateur, thème clair
- [x] Hors connexion (serveur arrêté)
- [x] Contrastes (2 thèmes), clavier, titres, noms accessibles
- [x] Lighthouse
- [x] Correction des 16 bugs trouvés (voir `AUDIT.md`), zéro bug connu

## Phase 4 — Audit des fonctionnalités
- [x] Inventaire et pistes (`FONCTIONNALITES.md`)
- [x] Carnet de terrain, lecture vocale, « Surprends-moi », raccourci `/`, badge « En cours », impression

## Phase 5 — Déploiement
- [x] `netlify.toml` (build, en-têtes de cache et de sécurité)
- [x] Workflow GitHub Pages
- [x] Instructions d'installation sur téléphone (`README.md`)
