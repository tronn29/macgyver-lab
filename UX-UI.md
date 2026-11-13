# Rapport UX/UI

## 1. Système de design

**Direction artistique** : interface tactique d'agent de terrain, ambiance de thriller d'action moderne et nocturne. Panneaux en verre dépoli sobres (opacité de 78 à 92 % pour préserver le contraste), fines lignes lumineuses, grille discrète en fond, coins de visée façon HUD, dossiers de mission avec tampon, schémas en plan technique lumineux. Aucun élément rétro (ni papier millimétré, ni ruban adhésif, ni machine à écrire).

**Jetons** (`src/styles/tokens.css`) : toutes les couleurs, polices, espacements (base 4 px), rayons, ombres et durées passent par des variables. Les composants n'ont aucune valeur en dur, ce qui permet d'ajouter des fonctions sans casser le design.

| Rôle | Sombre | Clair |
|---|---|---|
| Fond | `#070b11` bleu nuit → `#04070b` | `#edf1f5` |
| Surfaces | gris acier `#101923` / `#16212d` | `#ffffff` |
| Texte | blanc cassé `#e8edf2` | `#0c1620` |
| Accent (navigation, information) | cyan `#2ee6e6` / turquoise `#19c9b5` | `#00636b` |
| Action, alerte, décompte | orange vif `#ff8a1f` | `#a03f00` |
| Sécurité vert / orange / rouge | `#3ee08f` / `#ffb547` / `#ff6474` | `#076336` / `#7a4700` / `#b01e30` |

**Typographies** : Chakra Petch pour les titres, Inter pour le texte, JetBrains Mono pour les étiquettes, données et annotations.

**Composants** : boutons (primaire cyan, action orange, fantôme, discret, danger), puces, badges (sécurité, verdict, difficulté), panneaux, cartes, filtres, segments, interrupteurs, champs, dialogues natifs, notifications, infobulles, quiz, anneaux et barres de progression, états vides, chargement en reflet.

**Schémas** : charte unique (`src/styles/schemas.css`) avec classes de trait, de surface et de texte, marqueurs partagés et animations légères (flux, tracé, diffusion de gaz, pulsation). Les couleurs suivent le thème.

**Mise en page** : barre de navigation basse sur téléphone en portrait ; rail latéral compact sur téléphone en paysage ; rail complet avec liens secondaires sur grand écran. Fiches en deux colonnes (schéma fixe à gauche) en paysage et sur ordinateur.

## 2. Accessibilité (WCAG 2.2 AA)

- **Contrastes** : audit automatique de tous les textes, effets de verre compris, sur 12 pages et dans les 2 thèmes : **0 échec** après correction. Lighthouse Accessibilité : **100**.
- **Clavier** : lien d'évitement en premier arrêt, focus visible (anneau cyan de 2 px), dialogues natifs (`<dialog>`) avec focus piégé et touche Échap, focus placé sur le titre à chaque changement de page et annoncé au lecteur d'écran, raccourci `/` vers la recherche.
- **Lecteurs d'écran** : schémas en `role="img"` avec un texte alternatif descriptif ; régions `aria-live` pour les quiz, les notifications et le chrono ; `aria-pressed` sur les objets de mission, favoris et filtres ; `aria-current` dans la navigation ; un seul `h1` par page, hiérarchie de titres sans saut (vérifiée sur toutes les pages).
- **Cibles tactiles** : 44 px minimum pour les commandes.
- **Taille du texte** : réglable de 85 à 150 %, tout est en `rem`.
- **Mouvement** : respecte « réduire les animations » du système, avec un réglage qui force l'un ou l'autre. Les effets ne portent jamais d'information seuls.
- **Contraste renforcé** : option qui supprime le verre et rend les bordures franches.
- **Infobulles du glossaire** : bouton (clic ou clavier) ; au survol sur ordinateur, elles restent ouvertes sous la souris, se ferment avec Échap et rendent le focus (WCAG 1.4.13).

## 3. Améliorations UX faites pendant l'audit

| Problème constaté | Correction |
|---|---|
| Sur téléphone, le défi du jour et les 4 modules étaient sous la ligne de flottaison | Niveau et série côte à côte en version compacte, défi en pleine largeur : les modules remontent d'un écran. |
| Le bouton « agrandir » cachait le coin haut-droit des schémas | Bouton déplacé sous le schéma, à côté de la légende ; icône seule sur téléphone. |
| Les 26 objets d'une mission formaient une longue colonne sur téléphone | Vue scan en tuiles sur 2 colonnes ; la vue liste détaillée reste disponible. |
| Le code mission était tronqué et le compteur passait sur deux lignes dans la barre d'état | Compteur court (« 3 objets ») avec version complète pour le lecteur d'écran. |
| Le tampon du dossier chevauchait le texte sur mobile | Marge réservée au tampon. |
| Les idées clés du rapport s'affichaient sans accents (« deverrouillage ») | Libellés accentués ajoutés au contenu ; la comparaison reste insensible aux accents. |
| Formulations « bonne(s) réponse(s) », « action(s) » | Vrais pluriels via le système de traduction. |
| Une seule mauvaise réponse déclenchait « Point faible détecté » | Au moins 3 réponses ou une mission sont nécessaires. |
| Ouvrir l'écran d'une mission suffisait à la marquer « En cours » | Le brouillon n'est créé qu'en cas de vraie progression. |
| Le nom de l'appli passait sur deux lignes sur petit écran | Nom sur une seule ligne, taille réduite sous 360 px. |
| Thème clair : textes cyan ou vert juste sous 4,5:1 | Teintes du thème clair assombries. |

## 4. Parcours clés vérifiés

1. Accueil → défi du jour → 3 questions → XP et série.
2. Archives → filtre → fiche → schéma agrandi → mode enfant → terme du glossaire → quiz → fiche liée, équivalence ou expérience.
3. Recherche « que faire avec du papier alu ? » → objet → fonctions → mission où il apparaît.
4. Opérations → briefing → chrono → scan → sélection → indice → solution → rapport → solutions possibles → fiches à réviser.
5. Révision : les fiches dues reviennent, la boîte monte ou redescend.
