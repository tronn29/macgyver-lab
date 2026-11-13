/* Types du contenu (miroir de schema/content.schema.json) */

export type CategorieId =
  | 'electricite'
  | 'magnetisme'
  | 'chimie'
  | 'mecanique'
  | 'lumiere'
  | 'thermique'
  | 'pression'
  | 'materiaux'
  | 'fluides';

export type NiveauSecurite = 'vert' | 'orange' | 'rouge';
export type Verdict = 'vrai' | 'partiel' | 'faux';
export type Difficulte = 'facile' | 'moyen' | 'difficile';

export interface Securite {
  niveau: NiveauSecurite;
  note: string;
}

export interface SchemaSvg {
  fichier: string;
  alt: string;
  legende?: string;
}

export interface Quiz {
  question: string;
  choix: string[];
  reponse: number;
  explication: string;
}

export interface Categorie {
  id: CategorieId;
  nom: string;
  icone: string;
  description?: string;
}

export interface Fiche {
  id: string;
  titre: string;
  sousTitre?: string;
  categories: CategorieId[];
  /** Ancien champ indicatif ; le temps affiché est calculé (voir core/fiche.ts). */
  duree?: number;
  niveau?: number;
  principeSeul?: boolean;
  schema: SchemaSvg;
  /** Format long (v2) : paragraphes en texte enrichi. S'il est présent, il remplace principe et pourquoi. */
  texte?: string[];
  /** Format court (v1), conservé pour les fiches non migrées. */
  principe?: string[];
  pourquoi?: string[];
  enfant: string;
  /** Données clés : valeur, sa prononciation (dit) et son équivalent concret. */
  chiffres?: { valeur: string; label: string; dit?: string; concret?: string }[];
  /** Échelle de repères graduée (ex. : coefficient de frottement). */
  echelle?: { titre?: string; intro: string; niveaux: { valeur: string; dit: string; description: string }[] };
  realite: { verdict: Verdict; explication: string };
  securite: Securite;
  liens: { fiches?: string[]; equivalences?: string[]; pratique?: string[] };
  quiz: Quiz[];
  motsCles?: string[];
}

export interface Objet {
  id: string;
  nom: string;
  alias?: string[];
  lieux?: string[];
  icone: string;
  proprietes?: string[];
}

export interface FonctionObjet {
  objet: string;
  comment: string;
  pourquoi: string;
  efficacite: 1 | 2 | 3;
  limite?: string;
}

export interface Fonction {
  id: string;
  titre: string;
  icone: string;
  categorie: CategorieId;
  resume: string;
  principe: string;
  fiches?: string[];
  securite?: Securite;
  objets: FonctionObjet[];
}

export interface Experience {
  id: string;
  titre: string;
  sousTitre?: string;
  categories: CategorieId[];
  duree: number;
  difficulte: 1 | 2 | 3;
  adulte?: boolean;
  securite: Securite;
  schema: SchemaSvg;
  materiel: { nom: string; quantite?: string; objet?: string }[];
  etapes: string[];
  precautions: string[];
  resultat: string;
  explication: string[];
  pourAllerPlusLoin?: string;
  fiches?: string[];
}

export interface MissionSolution {
  id: string;
  titre: string;
  objets: string[];
  optionnels?: string[];
  principes?: string[];
  motsCles: string[][];
  etapes: string[];
  explication: string;
}

export interface Mission {
  id: string;
  titre: string;
  code?: string;
  difficulte: Difficulte;
  categories: CategorieId[];
  duree: number;
  briefing: { lieu: string; contexte: string; objectif: string; contraintes?: string[] };
  zones: { id: string; nom: string }[];
  objets: { objet: string; zone: string; etat?: string }[];
  leurres?: string[];
  objetCle?: string;
  pieceManquante?: { nom: string; remplacements: string[]; explication: string };
  solutions: MissionSolution[];
  indices: [string, string, string];
  fiches?: string[];
  equivalences?: string[];
}

export interface Terme {
  id: string;
  terme: string;
  definition: string;
  fiches?: string[];
}

export type EtapeType = 'fiche' | 'equivalence' | 'pratique' | 'mission';

export interface Parcours {
  id: string;
  titre: string;
  description: string;
  icone: string;
  etapes: { type: EtapeType; id: string }[];
}

export interface ContentIndex {
  version: string;
  langue?: string;
  categories: string[];
  theorie: string[];
  objets: string[];
  equivalences: string[];
  pratique: string[];
  missions: string[];
  glossaire: string[];
  parcours: string[];
}

export interface Content {
  version: string;
  categories: Categorie[];
  fiches: Fiche[];
  objets: Objet[];
  fonctions: Fonction[];
  experiences: Experience[];
  missions: Mission[];
  termes: Terme[];
  parcours: Parcours[];
  /* Index par identifiant */
  byId: {
    categorie: Map<string, Categorie>;
    fiche: Map<string, Fiche>;
    objet: Map<string, Objet>;
    fonction: Map<string, Fonction>;
    experience: Map<string, Experience>;
    mission: Map<string, Mission>;
    terme: Map<string, Terme>;
    parcours: Map<string, Parcours>;
  };
  /* Index inverses (calculés) */
  fonctionsParObjet: Map<string, Fonction[]>;
  missionsParObjet: Map<string, Mission[]>;
  experiencesParFiche: Map<string, Experience[]>;
  fichesParFiche: Map<string, Fiche[]>;
}
