# Audit des fonctionnalités (phase 4)

## 1. Ce qui existe

| Domaine | Fonctionnalités |
|---|---|
| **Accueil** (poste de commandement) | Niveau et XP, série de jours (avec alerte « en danger »), défi du jour, 4 modules avec anneau de progression, révision du jour, « Reprendre » la dernière page, point faible détecté ou suggestion de fiche, parcours en cours, recherche rapide |
| **Archives** | 22 fiches : schéma SVG animé et agrandissable, principe en 3 lignes, « Pourquoi ça marche » avec termes du glossaire en infobulle, données clés, « Série ou réalité ? », sécurité, liens symétriques vers fiches, équivalences et expériences, quiz, fiche précédente et suivante. Filtres par catégorie et par statut (lues, non lues, favoris) |
| **Arsenal** | 12 fonctions, 119 objets, efficacité notée de 1 à 3, comment / pourquoi / limite, vue par fonction ou par objet, page objet (fonctions possibles, missions où il apparaît, propriétés, lieux) |
| **Laboratoire** | 11 expériences : matériel, protocole à cocher, précautions, résultat, explication, variante, « J'ai réalisé l'expérience » |
| **Opérations** | 6 missions (2 faciles, 2 moyennes, 2 difficiles), dossier de briefing, compte à rebours avec pause, scan par zones (tuiles ou liste), 3 indices payants qui se débloquent dans l'ordre, solution écrite, brouillon automatique, rapport (score détaillé, idées clés, leurres, objet clé, pièce manquante, solutions possibles, auto-évaluation, fiches à réviser), historique |
| **Entraînement** | Défi du jour, révision espacée (Leitner), entraînement libre, 5 parcours thématiques |
| **Ressources** | Recherche globale (questions naturelles, surlignage), glossaire (65 termes), favoris |
| **Profil** | Progression (indicateurs, activité sur 28 jours, points faibles par catégorie, 11 insignes, historique), réglages, confidentialité |
| **Plateforme** | PWA installable, hors connexion, mises à jour signalées, raccourcis d'appli (défi, révision, opérations), partage d'une fiche en image, export / import / effacement, thème clair, sons optionnels, retour haptique |

## 2. Pistes d'amélioration étudiées

| Idée | Valeur pour apprendre | Coût | Décision |
|---|---|---|---|
| **Carnet de terrain** : notes personnelles par fiche, expérience ou mission | Forte : reformuler avec ses mots ancre la mémoire | Faible | **Ajouté** |
| **Lecture vocale** d'une fiche (respecte le mode enfant) | Forte : réviser en marchant, accessibilité | Faible | **Ajouté** |
| **« Surprends-moi »** : fiche au hasard parmi les non lues | Moyenne : curiosité, découverte | Très faible | **Ajouté** |
| **Raccourci `/`** vers la recherche | Moyenne sur ordinateur | Très faible | **Ajouté** |
| **Badge « En cours »** sur les missions avec brouillon | Moyenne : reprise du fil | Très faible | **Ajouté** |
| **Impression d'une fiche** (mise en page claire, sans interface) | Moyenne : fiche papier à garder | Faible | **Ajouté** |
| Insignes de progression | Motivation | Faible | Fait pendant la construction (11 insignes) |
| Points faibles reliés à une fiche conseillée sur l'accueil | Forte | Faible | Fait pendant la construction |
| Missions générées ou corrigées par IA | Forte | Élevé, nécessite un service externe (RGPD) | Écarté : contraire au « tout reste sur l'appareil » |
| Synchronisation entre appareils | Moyenne | Nécessite un serveur | Écarté. Remplacé par l'export / import d'un fichier |
| Rappel quotidien (notification) | Moyenne | Peu fiable sur iPhone sans serveur de push | Écarté pour l'instant |
| Mode « examen » chronométré multi-catégories | Moyenne | Moyen | À envisager : la révision et le défi couvrent déjà le besoin |
| Éditeur de contenu dans l'appli | Moyenne | Élevé | Écarté : les fichiers JSON et le validateur suffisent |

## 3. Ajoutés de ma propre initiative (sur toute la construction)

Défi du jour · série de jours · révision espacée · entraînement libre · glossaire avec infobulles · mode « explique-moi comme à un enfant » · parcours thématiques · statistiques et points faibles · insignes · partage en image · carnet de terrain · lecture vocale · « Surprends-moi » · raccourci `/` · impression · brouillon de mission · pause du chrono · auto-évaluation d'une solution alternative · vue scan ou liste · page objet (« que faire avec… ») · export / import de la progression · contraste renforcé · taille du texte · sons et retour haptique optionnels · raccourcis d'appli · alerte de nouvelle version.

## 4. Prochaines étapes suggérées (contenu)

- Ajouter des missions « difficiles » : le moteur de score et le format sont prêts.
- Ajouter une 3ᵉ question de quiz aux fiches (le format en accepte 3), pour varier davantage la révision.
- Ajouter des parcours (ex. « Chimie de cuisine », « Mécanique du quotidien »).
