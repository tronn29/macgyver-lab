# MacGyver Lab

Appli mobile personnelle (PWA) pour apprendre comment marche le monde, de façon concrète : comprendre des principes, détourner des objets du quotidien, improviser avec ce qu'on a.

- **Archives** (Théorie) : 22 fiches de révision avec schéma SVG animé, principe en 3 lignes, « Série ou réalité ? », niveau de sécurité, quiz, mode « explique-moi comme à un enfant ».
- **Arsenal d'objets** (Équivalences) : 12 fonctions × 119 objets, recherche par fonction ou par objet (« que faire avec du papier alu ? »).
- **Laboratoire** (Pratique) : 11 expériences sans danger, protocole à cocher.
- **Opérations** (Missions) : 6 briefings (facile, moyen, difficile), scan de la pièce, indices payants, compte à rebours, score fondé sur la logique, rapport « Mission réussie » ou « À revoir ».
- En plus : défi du jour, série de jours, révision espacée, parcours thématiques, glossaire avec infobulles, carnet de terrain, lecture vocale, statistiques et points faibles, insignes, partage d'une fiche en image, thème clair, hors connexion.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
```

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run validate` | vérifie tout le contenu JSON et les SVG |
| `npm test` | tests unitaires (score, révision, recherche, stockage, traductions) |
| `npm run build` | validation + typecheck + build de production dans `dist/` |
| `npm run preview` | sert `dist/` (avec service worker) sur http://localhost:4173 |
| `npm run icons` | régénère les icônes de l'appli |

## Ajouter du contenu

Voir **[CONTENU.md](CONTENU.md)**. En résumé : modifier les fichiers JSON de `public/content/fr/` (et ajouter un SVG dans `public/schemas/` pour une fiche ou une expérience), lancer `npm run validate`, puis publier.

## Déployer (gratuit)

### Option A — Netlify (le plus simple)
1. Crée un dépôt Git et pousse le projet sur GitHub (dépôt privé possible).
2. Sur netlify.com : *Add new site → Import an existing project →* choisis le dépôt.
3. Netlify lit `netlify.toml` : build `npm ci && npm run build`, dossier `dist`. Clique sur *Deploy*.
4. Chaque `git push` republie l'appli automatiquement.

Variante sans Git : `npm run build`, puis glisse le dossier `dist/` sur https://app.netlify.com/drop.

### Option B — GitHub Pages
1. Pousse le projet sur GitHub (branche `main`).
2. Dans le dépôt : *Settings → Pages → Source : GitHub Actions*.
3. Le workflow `.github/workflows/deploy.yml` teste, construit et publie à chaque push. L'adresse sera `https://<ton-compte>.github.io/<depot>/`, ici **https://tronn29.github.io/macgyver-lab/**.

Le fonctionnement sous ce sous-chemin a été vérifié : liens, service worker (portée `/macgyver-lab/`), manifeste, icônes et mode hors connexion.

L'appli utilise des chemins relatifs et un routage par ancre (`#/…`) : elle fonctionne dans un sous-dossier sans configuration.

> GitHub Pages exige un dépôt public avec un compte gratuit ; Netlify accepte un dépôt privé. L'appli ne contient aucune donnée personnelle et demande aux moteurs de recherche de ne pas l'indexer.

## Installer sur ton téléphone

**Android (Chrome)** : ouvre l'adresse de l'appli → menu ⋮ → *Installer l'application* (ou la bannière proposée). Tu peux aussi passer par *Réglages → Installer l'appli* dans MacGyver Lab.

**iPhone (Safari)** : ouvre l'adresse dans Safari → bouton *Partager* → *Sur l'écran d'accueil* → *Ajouter*.

Ouvre l'appli une première fois avec du réseau : tout le contenu est alors mis en cache et elle fonctionne ensuite **hors connexion**. Quand une nouvelle version est publiée, un bandeau « Une nouvelle version est prête » propose la mise à jour.

## Confidentialité

Aucun compte, aucun traceur, aucune requête vers un tiers (polices incluses). La progression reste dans le stockage local du téléphone ; export, import et effacement depuis *Réglages*. Détails dans l'appli, page *Confidentialité*.

## Documentation

- [DECISIONS.md](DECISIONS.md) : choix techniques et de conception
- [UX-UI.md](UX-UI.md) : système de design, accessibilité, améliorations UX
- [AUDIT.md](AUDIT.md) : bugs trouvés et corrigés, tests, mesures Lighthouse
- [FONCTIONNALITES.md](FONCTIONNALITES.md) : inventaire, améliorations, ajouts
- [TACHES.md](TACHES.md) : liste des tâches
- [CONTENU.md](CONTENU.md) : guide pour ajouter du contenu (format, guide de style, règle des ordres de grandeur)
- [ORDRES-DE-GRANDEUR.md](ORDRES-DE-GRANDEUR.md) : liste des ordres de grandeur avec leur prononciation et leur équivalent concret
