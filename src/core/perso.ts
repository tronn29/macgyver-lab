/*
 * Contenu personnel : fiches et fonctions écrites dans l'appli (éditeur), sauvegardées sur l'appareil.
 *
 * - Stockage séparé (clé « mgl:perso ») : le contenu officiel (fichiers JSON validés) n'est jamais modifié.
 * - Identifiants préfixés « perso- » : aucune collision possible avec une fiche officielle.
 * - Superposition au contenu chargé (tables par identifiant, liens par objet) : favoris, lecture,
 *   quiz, révision et statistiques fonctionnent comme pour les fiches officielles, mais les listes
 *   officielles (c.fiches, c.fonctions) restent intactes.
 */
import { normalize } from './dom';
import { PERSO_KEY, readKey, update, writeKey } from './store';
import type { CategorieId, Content, Fiche, Fonction, NiveauSecurite, Objet, Quiz, Verdict } from './types';
import regle from './regle-contenu.json';

export const PREFIXE = 'perso-';
export const SCHEMA_DEFAUT = 'perso-defaut.svg';

/** Schémas de principe dessinés pour les fiches personnelles (proposés dans l'éditeur). */
export const SCHEMAS_PERSO: { fichier: string; titre: string; alt: string }[] = [
  {
    fichier: 'perso-rasoir-haute-tension.svg',
    titre: "Schéma du rasoir : élever la tension, étincelle dans l'air",
    alt: "Schéma de principe en deux parties. 1 : deux bobines sur un même noyau, peu de spires à gauche et beaucoup de spires à droite ; une basse tension entre, une haute tension sort. 2 : deux tiges séparées par de l'air isolant ; au-delà d'un seuil, l'air s'ionise et une étincelle passe, comme la foudre en tout petit.",
  },
];
export const CATEGORIES: CategorieId[] = ['electricite', 'magnetisme', 'chimie', 'mecanique', 'lumiere', 'thermique', 'pression', 'materiaux', 'fluides'];

export interface PersoData {
  version: 1;
  fiches: Fiche[];
  fonctions: Fonction[];
  objets: Objet[];
}

export const isPerso = (id: string): boolean => id.startsWith(PREFIXE);
/** Identifiants d'aperçu de l'éditeur : commencent par « _modele », donc ignorés par la progression. */
export const APERCU_FICHE = '_modele-apercu-fiche';
export const APERCU_FONCTION = '_modele-apercu-fonction';
/** Contenu écrit dans l'appli (enregistré ou en aperçu). */
export const estPerso = (id: string): boolean => isPerso(id) || id.startsWith('_modele-apercu');

/* ---------- Lecture / écriture ---------- */

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function normFiche(x: unknown): Fiche | null {
  const f = x as Partial<Fiche> | null;
  if (!f || typeof f !== 'object' || !isPerso(str(f.id)) || !str(f.titre).trim()) return null;
  const texte = arr<string>(f.texte).filter((p) => typeof p === 'string' && p.trim());
  if (!texte.length) return null;
  const quiz = arr<Quiz>(f.quiz).filter((q) => q && str(q.question).trim() && arr<string>(q.choix).length >= 2 && Number.isInteger(q.reponse) && q.reponse < q.choix.length);
  return {
    id: str(f.id),
    titre: str(f.titre).trim(),
    sousTitre: str(f.sousTitre) || undefined,
    categories: ((cats) => (cats.length ? cats : (['mecanique'] as CategorieId[])))(arr<CategorieId>(f.categories).filter((c) => CATEGORIES.includes(c)).slice(0, 3)),
    schema: { fichier: str(f.schema?.fichier, SCHEMA_DEFAUT) || SCHEMA_DEFAUT, alt: str(f.schema?.alt), legende: str(f.schema?.legende) || undefined },
    texte,
    enfant: str(f.enfant),
    realite: { verdict: (['vrai', 'partiel', 'faux'] as Verdict[]).includes(f.realite?.verdict as Verdict) ? (f.realite!.verdict as Verdict) : 'partiel', explication: str(f.realite?.explication), nuance: str(f.realite?.nuance) || undefined },
    securite: { niveau: (['vert', 'orange', 'rouge'] as NiveauSecurite[]).includes(f.securite?.niveau as NiveauSecurite) ? (f.securite!.niveau as NiveauSecurite) : 'vert' },
    liens: {},
    quiz,
    motsCles: arr<string>(f.motsCles).filter((m) => typeof m === 'string'),
  };
}

function normObjet(x: unknown): Objet | null {
  const o = x as Partial<Objet> | null;
  if (!o || !isPerso(str(o.id)) || !str(o.nom).trim()) return null;
  return { id: str(o.id), nom: str(o.nom).trim(), alias: [], lieux: [], icone: str(o.icone, 'other') || 'other', proprietes: [] };
}

function normFonction(x: unknown): Fonction | null {
  const f = x as Partial<Fonction> | null;
  if (!f || !isPerso(str(f.id)) || !str(f.titre).trim()) return null;
  const objets = arr<Fonction['objets'][number]>(f.objets).filter((o) => o && str(o.objet) && str(o.comment).trim() + str(o.pourquoi).trim());
  if (!objets.length) return null;
  return {
    id: str(f.id),
    titre: str(f.titre).trim(),
    icone: str(f.icone, 'multitool') || 'multitool',
    categorie: CATEGORIES.includes(f.categorie as CategorieId) ? (f.categorie as CategorieId) : 'mecanique',
    resume: str(f.resume),
    principe: str(f.principe),
    fiches: [],
    objets: objets.map((o) => ({ objet: str(o.objet), comment: str(o.comment), pourquoi: str(o.pourquoi), efficacite: ([1, 2, 3].includes(o.efficacite) ? o.efficacite : 2) as 1 | 2 | 3, limite: str(o.limite) || undefined })),
  };
}

/** Lecture tolérante : un contenu abîmé est ignoré élément par élément, jamais bloquant. */
export function loadPerso(): PersoData {
  let raw: unknown = null;
  try {
    raw = JSON.parse(readKey(PERSO_KEY) || 'null');
  } catch {
    raw = null;
  }
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<PersoData>;
  return {
    version: 1,
    fiches: arr(d.fiches).map(normFiche).filter((x): x is Fiche => Boolean(x)),
    fonctions: arr(d.fonctions).map(normFonction).filter((x): x is Fonction => Boolean(x)),
    objets: arr(d.objets).map(normObjet).filter((x): x is Objet => Boolean(x)),
  };
}

function savePerso(d: PersoData): boolean {
  return writeKey(PERSO_KEY, JSON.stringify(d));
}

/* ---------- Identifiants ---------- */

export function slugify(text: string): string {
  return normalize(text).replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'sans-titre';
}

export function newId(titre: string, existing: Set<string>, prefixe = PREFIXE): string {
  const base = `${prefixe}${slugify(titre)}`.slice(0, 40).replace(/-$/, '');
  let id = base;
  for (let n = 2; existing.has(id); n++) id = `${base}-${n}`;
  return id;
}

/* ---------- Paragraphes : éditeur ↔ texte enrichi ---------- */

export type TypeParagraphe = 'simple' | 'accroche' | 'serie' | 'retenir';
export interface ParagrapheEdit {
  type: TypeParagraphe;
  phrase: string; // phrase d'accroche, affichée en gras (type « accroche »)
  texte: string; // texte du paragraphe (simple, accroche, À retenir)
  serie: string; // « Dans la série »
  realite: string; // « Dans la réalité »
}

export const paragrapheVide = (type: TypeParagraphe = 'simple'): ParagrapheEdit => ({ type, phrase: '', texte: '', serie: '', realite: '' });

/** Texte saisi nettoyé : espaces réduits, astérisques du gras retirés (le gras vient du type choisi). */
export const clean = (s: string): string => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

export function toTexte(p: ParagrapheEdit): string {
  switch (p.type) {
    case 'retenir':
      return clean(p.texte) ? `**À retenir :** ${clean(p.texte)}` : '';
    case 'serie': {
      const serie = clean(p.serie);
      const realite = clean(p.realite);
      if (!serie && !realite) return '';
      return `**Dans la série**, ${serie} **Dans la réalité**, ${realite}`.replace(/\s+/g, ' ').trim();
    }
    case 'accroche': {
      const phrase = clean(p.phrase);
      const corps = clean(p.texte);
      if (!phrase) return corps;
      return corps ? `**${phrase}** ${corps}` : `**${phrase}**`;
    }
    default:
      return clean(p.texte);
  }
}

export function fromTexte(s: string): ParagrapheEdit {
  const t = s.trim();
  const ret = t.match(/^\*\*\s*À retenir\s*:?\s*\*\*\s*:?\s*([\s\S]*)$/);
  if (ret) return { ...paragrapheVide('retenir'), texte: ret[1].trim() };
  const ser = t.match(/^\*\*Dans la série\*\*,?\s*([\s\S]*?)\s*\*\*Dans la réalité\*\*,?\s*([\s\S]*)$/);
  if (ser) return { ...paragrapheVide('serie'), serie: ser[1].trim(), realite: ser[2].trim() };
  const acc = t.match(/^\*\*([^*]+)\*\*\s*([\s\S]*)$/);
  if (acc) return { ...paragrapheVide('accroche'), phrase: acc[1].trim(), texte: acc[2].replace(/\*\*/g, '').trim() };
  return { ...paragrapheVide('simple'), texte: t.replace(/\*\*/g, '') };
}

/** Texte final : paragraphes vides retirés, « À retenir » placé en dernier. */
export function assembleTexte(paras: ParagrapheEdit[]): string[] {
  const out = paras.filter((p) => p.type !== 'retenir').map(toTexte).filter(Boolean);
  const retenir = paras.filter((p) => p.type === 'retenir').map(toTexte).filter(Boolean);
  return [...out, ...retenir];
}

/** Explication « Série ou réalité ? » déduite du paragraphe correspondant (pour l'export). */
export function explicationDepuis(paras: ParagrapheEdit[]): string {
  const p = paras.find((x) => x.type === 'serie' && (clean(x.serie) || clean(x.realite)));
  return p ? [clean(p.serie) && `Dans la série, ${clean(p.serie)}`, clean(p.realite) && `Dans la réalité, ${clean(p.realite)}`].filter(Boolean).join(' ') : '';
}

/* ---------- Règle de contenu (la même liste que le validateur) ---------- */

const INTERDITS = regle.interdits.map((r) => new RegExp(r, 'i'));

/** Premier terme interdit trouvé dans les textes, ou null. */
export function termeInterdit(textes: string[]): string | null {
  for (const txt of textes) for (const re of INTERDITS) {
    const m = txt.match(re);
    if (m) return m[0];
  }
  return null;
}

/* ---------- Brouillons (formulaire en cours, sauvegarde automatique) ---------- */

const BROUILLON_KEY = 'mgl:perso-brouillon';
type Brouillons = Record<string, { date: string; data: unknown }>;
const readBrouillons = (): Brouillons => {
  try {
    const v = JSON.parse(readKey(BROUILLON_KEY) || '{}');
    return v && typeof v === 'object' ? (v as Brouillons) : {};
  } catch {
    return {};
  }
};
export const getBrouillon = (cle: string): unknown => readBrouillons()[cle]?.data ?? null;
export function setBrouillon(cle: string, data: unknown): void {
  const b = readBrouillons();
  b[cle] = { date: new Date().toISOString(), data };
  writeKey(BROUILLON_KEY, JSON.stringify(b));
}
export function clearBrouillon(cle: string): void {
  const b = readBrouillons();
  delete b[cle];
  writeKey(BROUILLON_KEY, JSON.stringify(b));
}

/* ---------- Superposition au contenu chargé ---------- */

let applied = { fiches: [] as string[], fonctions: [] as string[], objets: [] as string[] };

/** (Re)applique le contenu perso : retire l'ancienne superposition, ajoute l'actuelle. */
export function applyPerso(c: Content, d: PersoData = loadPerso()): void {
  for (const id of applied.fiches) c.byId.fiche.delete(id);
  for (const id of applied.fonctions) c.byId.fonction.delete(id);
  for (const id of applied.objets) c.byId.objet.delete(id);
  for (const [k, list] of c.fonctionsParObjet) c.fonctionsParObjet.set(k, list.filter((f) => !isPerso(f.id)));
  // Les identifiants perso ne peuvent pas recouvrir une fiche officielle (préfixe), mais on vérifie quand même
  const fiches = d.fiches.filter((f) => !c.fiches.some((o) => o.id === f.id));
  const fonctions = d.fonctions.filter((f) => !c.fonctions.some((o) => o.id === f.id));
  const objets = d.objets.filter((o) => !c.objets.some((x) => x.id === o.id));
  fiches.forEach((f) => c.byId.fiche.set(f.id, f));
  objets.forEach((o) => c.byId.objet.set(o.id, o));
  fonctions.forEach((f) => {
    c.byId.fonction.set(f.id, f);
    for (const o of f.objets) {
      const list = c.fonctionsParObjet.get(o.objet) ?? [];
      if (!list.includes(f)) c.fonctionsParObjet.set(o.objet, [...list, f]);
    }
  });
  applied = { fiches: fiches.map((f) => f.id), fonctions: fonctions.map((f) => f.id), objets: objets.map((o) => o.id) };
  persoCache = { fiches, fonctions, objets };
}

let persoCache: { fiches: Fiche[]; fonctions: Fonction[]; objets: Objet[] } = { fiches: [], fonctions: [], objets: [] };
export const persoFiches = (): Fiche[] => persoCache.fiches;
export const persoFonctions = (): Fonction[] => persoCache.fonctions;

/** Toutes les fiches (officielles puis perso) : statistiques et totaux. */
export const toutesFiches = (c: Content): Fiche[] => [...c.fiches, ...persoCache.fiches];
export const toutesFonctions = (c: Content): Fonction[] => [...c.fonctions, ...persoCache.fonctions];

/* ---------- Enregistrement ---------- */

export function saveFiche(c: Content, f: Fiche): Fiche {
  const d = loadPerso();
  const clean = normFiche(f);
  if (!clean) throw new Error('fiche invalide');
  const i = d.fiches.findIndex((x) => x.id === clean.id);
  if (i >= 0) d.fiches[i] = clean;
  else d.fiches.push(clean);
  if (!savePerso(d)) throw new Error('stockage');
  applyPerso(c, d);
  return clean;
}

export function saveFonction(c: Content, f: Fonction, nouveauxObjets: Objet[]): Fonction {
  const d = loadPerso();
  for (const o of nouveauxObjets) if (!d.objets.some((x) => x.id === o.id)) d.objets.push(o);
  const clean = normFonction(f);
  if (!clean) throw new Error('fonction invalide');
  const i = d.fonctions.findIndex((x) => x.id === clean.id);
  if (i >= 0) d.fonctions[i] = clean;
  else d.fonctions.push(clean);
  // Objets perso devenus inutiles : retirés
  const utilises = new Set(d.fonctions.flatMap((fn) => fn.objets.map((o) => o.objet)));
  d.objets = d.objets.filter((o) => utilises.has(o.id));
  if (!savePerso(d)) throw new Error('stockage');
  applyPerso(c, d);
  return clean;
}

/** Suppression : le contenu et toutes ses traces de progression. */
export function deletePerso(c: Content, type: 'fiche' | 'fonction', id: string): void {
  if (!isPerso(id)) return; // jamais une fiche officielle
  const d = loadPerso();
  if (type === 'fiche') d.fiches = d.fiches.filter((f) => f.id !== id);
  else {
    d.fonctions = d.fonctions.filter((f) => f.id !== id);
    const utilises = new Set(d.fonctions.flatMap((fn) => fn.objets.map((o) => o.objet)));
    d.objets = d.objets.filter((o) => utilises.has(o.id));
  }
  savePerso(d);
  update((p) => {
    delete p.favoris[`${type}:${id}`];
    delete p.notes[`${type}:${id}`];
    if (type === 'fiche') {
      delete p.lus[id];
      delete p.srs[id];
      delete p.quizFiches[id];
    } else delete p.vuesFonctions[id];
    if (p.dernier?.route.endsWith(`/${id}`)) p.dernier = null;
  });
  applyPerso(c, d);
}

/** Effacement de tout le contenu perso (réglages) : fiches, fonctions, objets, brouillons et leurs traces. */
export function deleteAllPerso(c: Content): void {
  const d = loadPerso();
  for (const f of d.fiches) deletePerso(c, 'fiche', f.id);
  for (const f of d.fonctions) deletePerso(c, 'fonction', f.id);
  writeKey(PERSO_KEY, JSON.stringify({ version: 1, fiches: [], fonctions: [], objets: [] }));
  writeKey('mgl:perso-brouillon', '{}');
  applyPerso(c);
}

/* ---------- Objets d'une fonction perso : catalogue ou objet perso ---------- */

export function resolveObjet(c: Content, nom: string, existing: Objet[]): { id: string; nouveau: Objet | null } {
  const n = normalize(nom);
  const catalogue = c.objets.find((o) => normalize(o.nom) === n || (o.alias ?? []).some((a) => normalize(a) === n));
  if (catalogue) return { id: catalogue.id, nouveau: null };
  const deja = existing.find((o) => normalize(o.nom) === n);
  if (deja) return { id: deja.id, nouveau: null };
  const ids = new Set([...c.objets.map((o) => o.id), ...existing.map((o) => o.id)]);
  const id = newId(nom, ids, `${PREFIXE}objet-`);
  return { id, nouveau: { id, nom: nom.trim(), alias: [], lieux: [], icone: 'other', proprietes: [] } };
}

/* ---------- Export au format des modèles (MODELES.md) ---------- */

const sansPrefixe = (id: string) => id.replace(/^perso-(objet-)?/, '');

/** Une fiche officielle compte au moins 4 paragraphes : les manquants sont ajoutés à remplir, avant « À retenir ». */
function completerTexte(texte: string[]): string[] {
  const out = [...texte];
  const fin = out.length && /^\*\*\s*À retenir/.test(out[out.length - 1]) ? out.pop()! : null;
  if (!out.some((p) => /Dans la série/.test(p) && /Dans la réalité/.test(p))) out.push("**Dans la série**, [ce que fait le héros à l'écran] **Dans la réalité**, [ce qui marche vraiment, et à quelles conditions]");
  while (out.length < 3) out.push('[Paragraphe à ajouter : une fiche officielle compte au moins 4 paragraphes]');
  out.push(fin ?? "**À retenir :** [Deux ou trois phrases qui résument le principe]");
  return out;
}

export function exportFiche(f: Fiche): string {
  const defaut = f.schema.fichier === SCHEMA_DEFAUT;
  const quiz = f.quiz.length
    ? f.quiz.map((q) => ({ ...q, explication: q.explication || "[Pourquoi c'est la bonne réponse]" }))
    : [{ question: '[Question claire sur un compte ou un pourquoi]', choix: ['[Bonne réponse]', '[Mauvaise réponse plausible]', '[Mauvaise réponse plausible]'], reponse: 0, explication: "[Pourquoi c'est la bonne réponse]" }];
  const fiche = {
    id: sansPrefixe(f.id),
    titre: f.titre,
    ...(f.sousTitre ? { sousTitre: f.sousTitre } : {}),
    categories: f.categories,
    schema: defaut
      ? { fichier: `[Nom du dessin à créer dans public/schemas/, ex. : ${sansPrefixe(f.id)}.svg ; pars de modele-exemple.svg]`, alt: '[Description complète de ce que montre le schéma (au moins 20 caractères)]', legende: '[Une phrase sous le schéma]' }
      : f.schema,
    texte: completerTexte(f.texte ?? []),
    enfant: f.enfant || '[Explication pour un enfant de 8 ans, avec une image du quotidien (au moins 20 caractères)]',
    realite: { verdict: f.realite.verdict, ...(f.realite.nuance ? { nuance: f.realite.nuance } : {}), explication: f.realite.explication || '[Deux phrases : ce que montre la série, ce qui est vrai, et le cas où ça marche]' },
    securite: { niveau: f.securite.niveau },
    liens: {},
    quiz,
    motsCles: f.motsCles?.length ? f.motsCles : ['[Mot de recherche]'],
  };
  return `${JSON.stringify({ modele: 'fiche-theorie', aide: "[Fiche exportée depuis l'appli. Dépose ce fichier dans public/content/fr/_modeles/, remplace les textes entre crochets restants, puis : npm run modele:verifier -- <fichier>. Voir MODELES.md.]", theorie: [fiche] }, null, 2)}\n`;
}

export function exportFonction(c: Content, f: Fonction): string {
  const perso = f.objets.map((o) => c.byId.objet.get(o.objet)).filter((o): o is Objet => Boolean(o && isPerso(o.id)));
  const fonction = {
    id: sansPrefixe(f.id),
    titre: f.titre,
    icone: f.icone,
    categorie: f.categorie,
    resume: f.resume || '[Une phrase : à quoi sert cette fonction]',
    principe: f.principe || '[Deux ou trois phrases : la physique commune à tous les objets]',
    objets: f.objets.map((o) => ({ ...o, objet: isPerso(o.objet) ? sansPrefixe(o.objet) : o.objet, comment: o.comment || "[Comment l'utiliser]", pourquoi: o.pourquoi || '[Le principe, en une phrase]' })),
  };
  const objets = perso.map((o) => ({ id: sansPrefixe(o.id), nom: o.nom, alias: [], lieux: ['[Où le trouver : cuisine, garage, salle-de-bain, bureau, exterieur, voiture, chambre, atelier ou sac]'], icone: o.icone, proprietes: ['[Propriété utile, ex. : isolant]'] }));
  return `${JSON.stringify({ modele: 'equivalence', aide: "[Fonction exportée depuis l'appli. Dépose ce fichier dans public/content/fr/_modeles/, remplace les textes entre crochets restants (une fonction officielle demande au moins 3 objets), puis : npm run modele:verifier -- <fichier>. Voir MODELES.md.]", equivalences: [fonction], ...(objets.length ? { objets } : {}) }, null, 2)}\n`;
}

/**
 * Demande prête à coller dans Claude Code pour faire d'une fiche (ou fonction) personnelle
 * une fiche officielle : l'appli publiée ne peut pas modifier son propre contenu.
 */
export function demandeOfficielle(c: Content, type: 'fiche' | 'fonction', item: Fiche | Fonction): string {
  const fiche = type === 'fiche';
  const consigne = fiche
    ? `Rends officielle ma fiche personnelle « ${item.titre} » de MacGyver Lab. Ajoute-la aux fiches officielles au format long, garde mon texte, complète ce qui manque (schéma, quiz, version enfant, liens) et applique la règle de contenu.`
    : `Rends officielle ma fonction personnelle « ${item.titre} » de MacGyver Lab. Ajoute-la à l'Arsenal, garde mon texte, complète ce qui manque et applique la règle de contenu.`;
  return `${consigne}\n\n${fiche ? exportFiche(item as Fiche) : exportFonction(c, item as Fonction)}`;
}
